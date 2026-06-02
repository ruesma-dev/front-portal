// public/assets/js/auth.js
//
// Capa de autenticación del portal contra Azure Static Web Apps.
// Aísla todo el conocimiento de cómo SWA expone la identidad de Entra ID,
// de modo que app.js solo trabaja con un objeto de sesión limpio.
//
// SWA publica la identidad en /.auth/me:
//   { clientPrincipal: { userId, userDetails, identityProvider,
//                        userRoles: [...], claims: [{ typ, val }, ...] } }
//
// Con groupMembershipClaims = SecurityGroup en la App Registration, los
// grupos llegan como claims de tipo "groups" cuyo valor es el OBJECT ID (GUID)
// del grupo. Aquí se normalizan tanto los GUID como (por si acaso) nombres.
//
// MODO DEV (solo localhost): cuando no hay backend de auth disponible y la
// página corre en localhost, se devuelve una sesión SIMULADA para poder
// previsualizar la UI y el velado sin Entra. En Azure nunca se activa: allí
// /.auth/me responde de verdad y el host no es localhost.

window.RuesmaAuth = (function () {
  'use strict';

  const AUTH_ME_ENDPOINT = '/.auth/me';
  const LOGIN_URL = '/.auth/login/aad';
  const LOGOUT_URL = '/.auth/logout';

  // Tipos de claim donde Entra puede colocar los grupos.
  const GROUP_CLAIM_TYPES = [
    'groups',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
  ];

  // --- Modo desarrollo (solo en local) --------------------------------------
  const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]', ''];

  function isDevHost() {
    return DEV_HOSTS.includes(window.location.hostname);
  }

  // Grupos simulados en local. Por defecto incluye rrhh-usuarios (acceso a
  // Nóminas). Se puede sobreescribir con ?dev_groups=a,b o vaciar con ?dev_groups=
  function devGroupsFromUrl() {
    const raw = new URLSearchParams(window.location.search).get('dev_groups');
    if (raw === null) return ['rrhh-usuarios'];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function devSession() {
    const groups = devGroupsFromUrl();
    /* eslint-disable no-console */
    console.warn(
      '%c[Portal Ruesma] MODO DEV (localhost): sesion simulada, sin Entra.',
      'color:#9f2842;font-weight:600'
    );
    console.info('Grupos simulados:', groups.length ? groups.join(', ') : '(ninguno)');
    console.info('Cambia con ?dev_groups=rrhh-usuarios  o  ?dev_groups=  (sin acceso)');
    /* eslint-enable no-console */
    return {
      authenticated: true,
      name: 'dev (local)',
      email: 'dev@ruesma.es',
      groups,
      overage: false,
      dev: true,
    };
  }

  /**
   * Recupera el clientPrincipal de SWA. Devuelve null si no hay sesión
   * (anónimo) o si el endpoint no está disponible (p.ej. servidor estático).
   */
  async function fetchClientPrincipal() {
    try {
      const resp = await fetch(AUTH_ME_ENDPOINT, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!resp.ok) return null;
      const payload = await resp.json();
      return (payload && payload.clientPrincipal) || null;
    } catch (_err) {
      // Sin backend de auth (servidor estático local): tratamos como anónimo.
      return null;
    }
  }

  /** Extrae la lista de grupos (GUID y/o nombres) del clientPrincipal. */
  function extractGroups(principal) {
    if (!principal || !Array.isArray(principal.claims)) return [];
    const groups = principal.claims
      .filter((c) => GROUP_CLAIM_TYPES.includes(c.typ))
      .map((c) => (c.val || '').trim())
      .filter(Boolean);
    // userRoles puede contener roles mapeados desde grupos; los añadimos.
    if (Array.isArray(principal.userRoles)) {
      principal.userRoles
        .filter((r) => r && r !== 'anonymous' && r !== 'authenticated')
        .forEach((r) => groups.push(r));
    }
    return Array.from(new Set(groups));
  }

  /** Detecta el "claims overage" de Entra (>200 grupos -> grupos fuera del token). */
  function hasGroupOverage(principal) {
    if (!principal || !Array.isArray(principal.claims)) return false;
    return principal.claims.some((c) => c.typ === '_claim_names' || c.typ === 'hasgroups');
  }

  /**
   * Construye el objeto de sesión que consume el resto de la app.
   * @returns {Promise<{authenticated:boolean, name:string, email:string,
   *                    groups:string[], overage:boolean, dev?:boolean}>}
   */
  async function getSession() {
    const principal = await fetchClientPrincipal();
    if (!principal) {
      // Sin identidad: en local previsualizamos; en Azure mostramos la puerta.
      if (isDevHost()) return devSession();
      return { authenticated: false, name: '', email: '', groups: [], overage: false };
    }
    const email = principal.userDetails || '';
    return {
      authenticated: true,
      name: email.split('@')[0] || email,
      email,
      groups: extractGroups(principal),
      overage: hasGroupOverage(principal),
    };
  }

  function login() {
    window.location.href = LOGIN_URL + '?post_login_redirect_uri=/';
  }

  function logout() {
    window.location.href = LOGOUT_URL;
  }

  return { getSession, login, logout, LOGIN_URL, LOGOUT_URL };
})();