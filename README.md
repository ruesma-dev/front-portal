# Portal Ruesma (`swa-portal-ruesma`)

Portal corporativo que lista las aplicaciones internas de Construcciones Ruesma.
Cualquier usuario autenticado del tenant ve **todas** las apps; las que no puede
abrir aparecen **veladas** (atenuadas, con candado y sin enlace). El filtrado se
hace en el navegador a partir de los grupos de Entra ID del usuario.

- **Sin Function App**: es HTML + CSS + JS estático (igual que el portal del documento de arquitectura).
- **Acceso abierto al tenant**: la restricción real está en cada app, no en el portal.
- **Región SWA**: `westeurope` (SWA no existe en `spaincentral`).

## Estructura

```
front-portal/
├── README.md
├── .gitignore
└── public/                       ← contenido a desplegar (app_location)
    ├── index.html                # cabecera, hero, contenedor de catálogo y login gate
    ├── staticwebapp.config.json  # auth Entra single-tenant + rutas + cabeceras
    └── assets/
        ├── css/styles.css        # identidad corporativa (burdeos/acero) y estados
        ├── js/catalog.js         # ÚNICO archivo a editar para añadir apps
        ├── js/auth.js            # lectura de /.auth/me y extracción de grupos
        ├── js/app.js             # render del catálogo y estados de cada app
        └── img/                  # logo + favicon
```

> El convenio de "primera línea = ruta relativa comentada" se aplica a HTML/CSS/JS.
> `staticwebapp.config.json` no lleva cabecera porque JSON no admite comentarios.

## Configurar el catálogo (paso obligatorio)

Con `groupMembershipClaims = SecurityGroup`, el token entrega los grupos como
**Object ID (GUID)**, no como nombre. Hay que rellenar `requiredGroupId` en
`public/assets/js/catalog.js` con el GUID de cada grupo:

```powershell
az ad group show --group "rrhh-usuarios"        --query id -o tsv
az ad group show --group "albaranes-usuarios"   --query id -o tsv
az ad group show --group "seguimiento-usuarios" --query id -o tsv
```

Atajo: abre el portal ya logueado y mira la consola del navegador (F12). El portal
vuelca ahí los GUID de los grupos del usuario para que los copies al catálogo.

Mientras un `requiredGroupId` conserve el valor `REEMPLAZAR_...`, esa app se
mostrará **velada (sin acceso)** y dejará un aviso en consola.

## Añadir una app nueva

Solo se edita `catalog.js`, añadiendo un objeto al array `apps`:

```js
{
  id: 'contabilidad',
  title: 'Contabilidad',
  description: 'Texto corto.',
  category: 'Direccion',          // clave de categoryOrder / categoryLabels
  icon: 'chart',                  // payroll | delivery | chart | spark | clock | lock
  url: 'https://swa-contabilidad-ruesma...azurestaticapps.net',
  requiredGroupName: 'contabilidad-usuarios',
  requiredGroupId: ['<GUID>'],    // uno o varios
  comingSoon: false,
}
```

## Despliegue (sigue las convenciones del documento de arquitectura)

Variables base:

```powershell
$RG     = "rg-sigrid-dev-data-api"
$TENANT = "12d28010-1dd7-4689-9d16-7af8fc5519b8"
$SWA    = "swa-portal-ruesma"
```

1. **Crear la SWA Standard en westeurope**

   ```powershell
   az staticwebapp create --name $SWA --resource-group $RG --location westeurope --sku Standard
   $SWA_HOST = az staticwebapp show --name $SWA --resource-group $RG --query defaultHostname -o tsv
   ```

2. **Crear App Registration "Portal Ruesma" + Service Principal**

   ```powershell
   $APP = az ad app create --display-name "Portal Ruesma" --sign-in-audience AzureADMyOrg --query "{appId:appId,id:id}" -o json | ConvertFrom-Json
   az ad sp create --id $APP.appId
   $SECRET = (az ad app credential reset --id $APP.appId --display-name "swa-secret" --years 2 --query password -o tsv)
   ```

3. **Redirect URI + emisión de id_token**

   ```powershell
   az ad app update --id $APP.appId --web-redirect-uris "https://$SWA_HOST/.auth/login/aad/callback" --enable-id-token-issuance true
   ```

4. **Emitir los grupos en el token** (sin esto el portal no puede filtrar)

   ```powershell
   az ad app update --id $APP.appId --set "groupMembershipClaims=SecurityGroup"
   ```

5. **Inyectar credenciales en la SWA**

   ```powershell
   az staticwebapp appsettings set --name $SWA --resource-group $RG `
     --setting-names "AZURE_CLIENT_ID=$($APP.appId)" "AZURE_CLIENT_SECRET=$SECRET" --output none
   ```

6. **Acceso abierto al tenant**: a diferencia de las apps individuales, el portal
   **no** lleva `Assignment required` ni grupo asignado. Cualquier `@ruesma.es`
   autenticado ve la pantalla; la restricción está en cada app.

7. **Desplegar** (truco del documento para el bug de paths del CLI de SWA):
   copiar `public/` a una carpeta de staging y deployar desde ahí.

   ```powershell
   Remove-Item C:\temp\portal-stage -Recurse -Force -ErrorAction SilentlyContinue
   Copy-Item .\public\* C:\temp\portal-stage -Recurse
   swa deploy C:\temp\portal-stage --deployment-token (az staticwebapp secrets list --name $SWA --resource-group $RG --query "properties.apiKey" -o tsv) --env production
   ```

8. (Opcional) Dominio personalizado `portal.ruesma.es` cuando se decida la gestión de DNS.

## Preview local

```powershell
# desde la raíz del proyecto
swa start ./public
```

El emulador de SWA expone `/.auth/me` simulado para probar grupos. Si abres el
`index.html` directamente (sin emulador) verás la **puerta de login**, porque no
hay endpoint de auth.
