# deploy.ps1
# ============================================================================
# Despliegue del Portal Ruesma en Azure.
#
# Qué hace:
#   1. Crea (o reutiliza) la Static Web App  swa-portal-ruesma  en westeurope.
#   2. Crea (o reutiliza) la App Registration "Portal Ruesma" (single tenant).
#   3. Configura redirect URI y emisión de id_token.
#   4. Activa groupMembershipClaims = SecurityGroup (clave para filtrar por grupo).
#   5. Genera client secret y lo inyecta como AZURE_CLIENT_ID/SECRET en la SWA.
#   6. Confirma acceso abierto al tenant (sin appRoleAssignmentRequired).
#   7. Copia el front a una carpeta de staging para sortear el bug del SWA CLI 2.0.9.
#   8. Despliega con `swa deploy`.
#
# Cómo usarlo:
#   az login --tenant 12d28010-1dd7-4689-9d16-7af8fc5519b8
#   cd C:\Users\pgris\PycharmProjects\front-portal
#   .\deploy.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

# ----- Configuración --------------------------------------------------------
$RG          = "rg-sigrid-dev-data-api"
$LOCATION    = "westeurope"
$TENANT      = "12d28010-1dd7-4689-9d16-7af8fc5519b8"
$SWA_NAME    = "swa-portal-ruesma"
$APP_DISPLAY = "Portal Ruesma"
$STAGE_DIR   = "C:\temp\portal-stage"
$SOURCE_DIR  = ".\public"

function Section($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Info($msg)    { Write-Host "    $msg" -ForegroundColor Gray }
function Ok($msg)      { Write-Host "    $msg" -ForegroundColor Green }
function Warn($msg)    { Write-Host "    $msg" -ForegroundColor Yellow }

# Helper: hace un PATCH a Microsoft Graph pasando el body por fichero temporal.
# Esto sortea el problema de PowerShell mangling de comillas en --body en línea.
function Patch-Graph {
    param([string]$Uri, [string]$JsonBody)
    $tmp = New-TemporaryFile
    Set-Content -Path $tmp.FullName -Value $JsonBody -Encoding ascii -NoNewline
    try {
        az rest --method PATCH --uri $Uri `
            --headers "Content-Type=application/json" `
            --body "@$($tmp.FullName)"
        if ($LASTEXITCODE -ne 0) { throw "PATCH a $Uri falló (exit $LASTEXITCODE)" }
    } finally {
        Remove-Item $tmp.FullName -ErrorAction SilentlyContinue
    }
}

# ----- Validaciones previas -------------------------------------------------
Section "Validando entorno"

$CURRENT_TENANT = az account show --query tenantId -o tsv 2>$null
if (-not $CURRENT_TENANT) {
    Write-Error "No hay sesión activa en Azure CLI. Ejecuta: az login --tenant $TENANT"
}
if ($CURRENT_TENANT -ne $TENANT) {
    Write-Error "Tenant activo $CURRENT_TENANT != Ruesma $TENANT. Ejecuta: az login --tenant $TENANT"
}
Ok "Sesión Azure CLI en tenant Ruesma OK"

if (-not (Test-Path $SOURCE_DIR)) {
    Write-Error "No se encuentra $SOURCE_DIR. Ejecuta el script desde la raíz de front-portal."
}
Ok "Carpeta de origen $SOURCE_DIR encontrada"

# ----- 1. Static Web App ----------------------------------------------------
Section "1) Static Web App $SWA_NAME ($LOCATION)"

$swaExists = az staticwebapp list --resource-group $RG --query "[?name=='$SWA_NAME'] | length(@)" -o tsv
if ($swaExists -eq "0") {
    az staticwebapp create --name $SWA_NAME --resource-group $RG --location $LOCATION --sku Standard --output none
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la SWA" }
    Ok "SWA creada"
} else {
    Warn "Ya existe, se reutiliza"
}
$SWA_HOST = az staticwebapp show --name $SWA_NAME --resource-group $RG --query defaultHostname -o tsv
Ok "Hostname: $SWA_HOST"

# ----- 2. App Registration --------------------------------------------------
Section "2) App Registration '$APP_DISPLAY'"

$APPID = az ad app list --display-name $APP_DISPLAY --query "[0].appId" -o tsv
if (-not $APPID) {
    $APPID = az ad app create --display-name $APP_DISPLAY --sign-in-audience AzureADMyOrg --query appId -o tsv
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la App Registration" }
    az ad sp create --id $APPID --output none
    Ok "Creada con appId $APPID"
} else {
    Warn "Ya existe con appId $APPID"
}

# ----- 3. Redirect URI + id_token issuance ----------------------------------
Section "3) Redirect URI y emisión de id_token"

$REDIRECT = "https://$SWA_HOST/.auth/login/aad/callback"
az ad app update --id $APPID `
    --web-redirect-uris $REDIRECT `
    --enable-id-token-issuance true --output none
if ($LASTEXITCODE -ne 0) { throw "Fallo al actualizar redirect URI" }
Ok "Redirect URI: $REDIRECT"

# ----- 4. groupMembershipClaims = SecurityGroup -----------------------------
Section "4) groupMembershipClaims = SecurityGroup"

$APP_OBJECT_ID = az ad app show --id $APPID --query id -o tsv
Patch-Graph -Uri "https://graph.microsoft.com/v1.0/applications/$APP_OBJECT_ID" `
            -JsonBody '{"groupMembershipClaims":"SecurityGroup"}'

# Verificación explícita (no nos fiamos del HTTP 204, comprobamos el estado)
$gmc = az ad app show --id $APPID --query groupMembershipClaims -o tsv
if ($gmc -ne "SecurityGroup") {
    throw "groupMembershipClaims no quedó en SecurityGroup (valor actual: '$gmc')"
}
Ok "groupMembershipClaims = SecurityGroup (verificado)"

# ----- 5. Client secret + inyección en SWA ----------------------------------
Section "5) Generando client secret e inyectando en la SWA"

$SECRET = az ad app credential reset --id $APPID --display-name "swa-secret" --years 2 --query password -o tsv
if ($LASTEXITCODE -ne 0) { throw "No se pudo generar el client secret" }
az staticwebapp appsettings set --name $SWA_NAME --resource-group $RG `
    --setting-names "AZURE_CLIENT_ID=$APPID" "AZURE_CLIENT_SECRET=$SECRET" --output none
if ($LASTEXITCODE -ne 0) { throw "Fallo al inyectar app settings en la SWA" }
Ok "Secret generado (2 años) e inyectado en la SWA"
$SECRET = $null

# ----- 6. Acceso abierto al tenant ------------------------------------------
Section "6) Acceso abierto al tenant (sin Assignment required)"

$SP_ID = az ad sp show --id $APPID --query id -o tsv
$ASSIGN_REQUIRED = az rest --method GET `
    --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID" `
    --query "appRoleAssignmentRequired" -o tsv

if ($ASSIGN_REQUIRED -eq "true") {
    Patch-Graph -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID" `
                -JsonBody '{"appRoleAssignmentRequired":false}'
    Ok "appRoleAssignmentRequired = false (cualquier @ruesma.es puede entrar)"
} else {
    Ok "appRoleAssignmentRequired ya estaba en false"
}

# ----- 7. Staging --------------------------------------------------------
Section "7) Preparando staging (sortea el bug del SWA CLI 2.0.9)"

if (Test-Path $STAGE_DIR) { Remove-Item $STAGE_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $STAGE_DIR -Force | Out-Null
Copy-Item "$SOURCE_DIR\*" $STAGE_DIR -Recurse
Ok "Copiado a $STAGE_DIR"

# ----- 8. Deploy ------------------------------------------------------------
Section "8) Desplegando con SWA CLI"

$DEPLOY_TOKEN = az staticwebapp secrets list --name $SWA_NAME --resource-group $RG --query "properties.apiKey" -o tsv
swa deploy $STAGE_DIR --deployment-token $DEPLOY_TOKEN --env production
if ($LASTEXITCODE -ne 0) { throw "swa deploy falló" }

# ----- Resumen --------------------------------------------------------------
Write-Host ""
Write-Host "================== DESPLIEGUE COMPLETADO ==================" -ForegroundColor Green
Write-Host "Portal URL:       https://$SWA_HOST" -ForegroundColor White
Write-Host "App Registration: $APP_DISPLAY ($APPID)" -ForegroundColor White
Write-Host "Tenant:           Ruesma ($TENANT)" -ForegroundColor White
Write-Host ""
Write-Host "Acceso abierto al tenant: SI (sin Assignment required)" -ForegroundColor White
Write-Host "Grupos en el token:       SI (groupMembershipClaims = SecurityGroup)" -ForegroundColor White
Write-Host ""
Write-Host "Siguiente paso: rellena los GUID en catalog.js." -ForegroundColor Yellow
Write-Host "  az ad group show --group 'rrhh-usuarios' --query id -o tsv" -ForegroundColor Yellow
Write-Host "Y vuelve a ejecutar:" -ForegroundColor Yellow
Write-Host "  .\deploy.ps1" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Green