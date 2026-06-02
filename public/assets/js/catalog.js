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

  // ------------------------- Obra -------------------------------------------
  {
    id: 'albaranes',
    title: 'Albaranes',
    description:
      'Procesado de albaranes por email con extracción IA, enriquecimiento ERP y valoración por contrato.',
    category: 'Obra',
    icon: 'delivery',
    url: '',
    requiredGroupName: 'albaranes-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_albaranes_usuarios'],
    comingSoon: true,
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
    url: '',
    requiredGroupName: 'seguimiento-usuarios',
    requiredGroupId: ['REEMPLAZAR_OBJECT_ID_seguimiento_usuarios'],
    comingSoon: true,
  },
];

// Etiquetas legibles por categoría (sin acentos en las claves para evitar líos).
window.RUESMA_PORTAL.categoryLabels = {
  RRHH: 'Recursos Humanos',
  Estudio: 'Estudio',
  Compras: 'Compras',
  Obra: 'Obra',
  Calidad: 'Calidad y Medio Ambiente',
  Direccion: 'Dirección',
};
