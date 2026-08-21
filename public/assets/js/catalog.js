// public/assets/js/catalog.js
//
// Catálogo de aplicaciones del Portal Ruesma.
// -------------------------------------------------------------------------
// Este es EL ÚNICO archivo que hay que tocar para dar de alta una app nueva.
// El portal es 100% estático (sin Function App): el filtrado por grupos se
// resuelve en el navegador leyendo los claims del token de Entra ID.
//
// IMPORTANTE — emparejamiento por grupo:
//   Cuando la App Registration del portal tiene groupMembershipClaims =
//   SecurityGroup, el token entrega los grupos como OBJECT ID (GUID), no como
//   nombre. Por eso cada app declara `requiredGroupId` (uno o varios GUID).
//   `requiredGroupName` se usa solo para el texto "Solicita acceso al grupo X"
//   y como fallback en modo dev (localhost).
//
//   Para obtener el GUID de un grupo:
//     az ad group show --group "rrhh-usuarios" --query id -o tsv
//
//   Mientras un GUID siga con el valor placeholder ('REEMPLAZAR_...'), la app
//   funcionará en dev (por nombre) pero NO se desbloqueará en Azure hasta
//   rellenar el GUID real.
// -------------------------------------------------------------------------

window.RUESMA_PORTAL = window.RUESMA_PORTAL || {};

// Orden en que se pintan las categorías (las no listadas van al final, A-Z).
window.RUESMA_PORTAL.categoryOrder = [
  'RRHH',
  'Estudio',
  'Compras',
  'Obra',
  'Finanzas',
  'Calidad',
  'Direccion',
];

window.RUESMA_PORTAL.apps = [
  // ------------------------- RRHH -------------------------------------------
  {
    id: 'nominas-horas',
    title: 'Nóminas Horas',
    description:
      'Generación mensual de horas extra para Cegid a partir de los partes de trabajo de Sigrid.',
    category: 'RRHH',
    icon: 'payroll',
    url: 'https://lively-pond-007c90603.7.azurestaticapps.net',
    requiredGroupName: 'rrhh-usuarios',
    // ↓ az ad group show --group "rrhh-usuarios" --query id -o tsv
    requiredGroupId: ['9401d180-ce18-4955-8b7f-72bba9282f41'],
    comingSoon: false,
  },
  {
    id: 'retribucion-flexible',
    title: 'Retribución Flexible',
    description:
      'Vuelca los importes de retribución flexible (guardería, restaurante, transporte) en los Excel de Cegid Nóminas, casando por DNI.',
    category: 'RRHH',
    icon: 'gift',
    url: 'https://nice-flower-0ecac4103.7.azurestaticapps.net',
    requiredGroupName: 'rrhh-usuarios',
    requiredGroupId: ['9401d180-ce18-4955-8b7f-72bba9282f41'],
    comingSoon: false,
  },

  // ------------------------- Estudio ----------------------------------------
  {
    id: 'bc3',
    title: 'Gestión BC3',
    description:
      'Análisis y gestión de presupuestos BC3 para estudios y licitaciones de obra.',
    category: 'Estudio',
    icon: 'building',
    url: '',
    requiredGroupName: 'bc3-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_bc3_usuarios'],
    comingSoon: true,
  },

  // ------------------------- Compras ----------------------------------------
  {
    id: 'contratos',
    title: 'Seguimiento de Contratos',
    description:
      'Seguimiento de contratos de proveedores y subcontratistas: vigencia, consumo y vencimientos.',
    category: 'Compras',
    icon: 'contract',
    url: '',
    requiredGroupName: 'contratos-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_contratos_usuarios'],
    comingSoon: true,
  },

  {
    id: 'comparativos',
    title: 'Seguimiento de Comparativos',
    description:
      'Cuadro de mando en Power BI para el seguimiento de comparativos de ofertas de proveedores.',
    category: 'Compras',
    icon: 'compare',
    url: 'https://app.fabric.microsoft.com/groups/96e178f0-db35-4586-8d54-59943d946283/reports/33fb592c-5e2d-4b78-9a51-66caf4ca3dae/23c5e39a53617cfa8255?experience=power-bi',
    requiredGroupName: 'compras-usuarios',
    // ↓ az ad group show --group "compras-usuarios" --query id -o tsv
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_compras_usuarios'],
    comingSoon: false,
  },

  // ------------------------- Obra -------------------------------------------
  {
    id: 'albaranes',
    title: 'Albaranes',
    description:
      'Procesado de albaranes por email con extracción IA, enriquecimiento ERP y valoración por contrato.',
    category: 'Obra',
    icon: 'delivery',
    url: 'https://ca-sv4-front.grayrock-806c3ddd.spaincentral.azurecontainerapps.io/documents',
    requiredGroupName: 'albaranes-portal-users',
    requiredGroupId: ['c3b80ef7-5673-4458-91d3-ec8f5cdd51dd'],
    comingSoon: false,
  },
  {
    id: 'partes-trabajo',
    title: 'Partes de Trabajo',
    description:
      'Gestión de los partes de trabajo diarios: extracción IA, validación y volcado a Sigrid.',
    category: 'Obra',
    icon: 'contract',
    url: 'https://ca-sv4-front.yellowplant-2add9c3e.spaincentral.azurecontainerapps.io/obras',
    requiredGroupName: 'partes-portal-users',
    requiredGroupId: ['6779536e-54f1-4c2e-94cc-c40a3c87a3d9'],   // o  []  para abrir a cualquier autenticado
    comingSoon: false,
  },
  {
    id: 'dedicacion',
    title: 'Dedicación',
    description:
      'Cuadrante mensual de dedicación por obra: reparto del 100 % de cada trabajador y registro en los partes de Sigrid.',
    category: 'Obra',
    icon: 'chart',
    url: 'https://ca-dedicacion-front.ashypebble-3c89c6d6.spaincentral.azurecontainerapps.io',
    requiredGroupName: 'dedicacion-portal-users',
    requiredGroupId: ['0967b79c-ff56-4b2e-a9a1-6217a1d5aa5c'],
    comingSoon: false,
  },
  {
    id: 'facturas',
    title: 'Facturas',
    description:
      'Procesado y conciliación de facturas de obra contra albaranes y contratos vigentes.',
    category: 'Obra',
    icon: 'invoice',
    url: '',
    requiredGroupName: 'facturas-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_facturas_usuarios'],
    comingSoon: true,
  },
  // ------------------------- Contabilidad y Finanzas ------------------------
  {
    id: 'remesas-bancarias',
    title: 'Remesas Bancarias',
    description:
      'Generación y gestión de remesas bancarias (adeudos y transferencias SEPA) para envío a la banca.',
    category: 'Finanzas',
    icon: 'bank',
    url: 'https://ca-finanzas-remesas-front.yellowplant-2add9c3e.spaincentral.azurecontainerapps.io',
    requiredGroupName: 'Contabilidad y Finanzas',
    // ↓ az ad group show --group "contabilidad-usuarios" --query id -o tsv
    requiredGroupId: ['b5dbff0a-8397-473a-b24d-3e8f7dff76ad'],
    comingSoon: false,
  },

  // ------------------------- Calidad y Medio Ambiente -----------------------
  {
    id: 'residuos',
    title: 'Gestión de Residuos',
    description:
      'Registro y trazabilidad de residuos generados en obra para cumplimiento medioambiental.',
    category: 'Calidad',
    icon: 'trash',
    url: '',
    requiredGroupName: 'residuos-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_residuos_usuarios'],
    comingSoon: true,
  },

  // ------------------------- Dirección --------------------------------------
  {
    id: 'seguimiento-economico',
    title: 'Seguimiento Económico',
    description:
      'Cuadro de mando de seguimiento mensual de obras (Producción, CD, CI y CP) Real vs Plan en Power BI.',
    category: 'Direccion',
    icon: 'chart',
    url: 'https://app.powerbi.com/groups/98e6a7e6-f000-478f-b131-f3fca6ac1763/reports/5ed83a47-cb8e-4964-8f1d-db289a8109cb/2555cf09f82af9d21500?experience=power-bi',
    requiredGroupName: 'direccion',
    requiredGroupId: ['c576cdbe-d0c5-42ac-9d10-74ca2a9306ba'],
    comingSoon: false,
  },
];

// Etiquetas legibles por categoría (sin acentos en las claves para evitar líos).
window.RUESMA_PORTAL.categoryLabels = {
  RRHH: 'Recursos Humanos',
  Estudio: 'Estudio',
  Compras: 'Compras',
  Obra: 'Obra',
  Finanzas: 'Contabilidad y Finanzas',
  Calidad: 'Calidad y Medio Ambiente',
  Direccion: 'Dirección',
};
