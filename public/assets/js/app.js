// public/assets/js/app.js
//
// Orquestación del portal: obtiene la sesión, calcula el estado de cada app
// (accesible / sin acceso / próximamente) y pinta el catálogo agrupado por
// categoría. No conoce los detalles de SWA (eso vive en auth.js) ni los datos
// de las apps (viven en catalog.js).

(function () {
  'use strict';

  const PLACEHOLDER_PREFIX = 'REEMPLAZAR_';

  // --- Iconos SVG inline (trazos sobrios, estilo plano industrial) ----------
  // Cada entrada es el "innerHTML" del <svg>; se monta dentro de un <svg> con
  // viewBox 0 0 24 24, stroke=currentColor, stroke-width 1.6, line-cap/join round.
  const ICONS = {
    payroll:
      '<path d="M3 5.5h18v13H3z"/><path d="M3 9.5h18"/><circle cx="8" cy="14" r="1.6"/><path d="M13 13h5M13 16h3"/>',
    delivery:
      '<path d="M3 6.5h11v9H3z"/><path d="M14 9.5h3.5L21 13v2.5h-7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
    chart:
      '<path d="M4 4v16h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    // Regalo (Retribución Flexible)
    gift:
      '<polyline points="20 12 20 22 4 22 4 12"/>' +
      '<rect x="2" y="7" width="20" height="5"/>' +
      '<line x1="12" y1="22" x2="12" y2="7"/>' +
      '<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>' +
      '<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    // Documento con líneas (Facturas)
    invoice:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
      '<polyline points="14 2 14 8 20 8"/>' +
      '<line x1="16" y1="13" x2="8" y2="13"/>' +
      '<line x1="16" y1="17" x2="8" y2="17"/>' +
      '<polyline points="10 9 9 9 8 9"/>',
    // Edificio multiplanta (BC3 / Estudio)
    building:
      '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>' +
      '<path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>' +
      '<path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>' +
      '<path d="M10 6h4"/><path d="M10 10h4"/>' +
      '<path d="M10 14h4"/><path d="M10 18h4"/>',
    // Documento con check (Contratos)
    contract:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
      '<polyline points="14 2 14 8 20 8"/>' +
      '<polyline points="9 15 11 17 15 13"/>',
    // Papelera (Residuos)
    trash:
      '<path d="M3 6h18"/>' +
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>' +
      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
      '<line x1="10" y1="11" x2="10" y2="17"/>' +
      '<line x1="14" y1="11" x2="14" y2="17"/>',
    // Auxiliares
    lock:
      '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    spark:
      '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  };

  function svgIcon(name, cls) {
    const inner = ICONS[name] || ICONS.spark;
    return (
      '<svg class="' +
      (cls || '') +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner +
      '</svg>'
    );
  }

  // --- Estado de acceso de una app ------------------------------------------
  function requiredIds(app) {
    const v = app.requiredGroupId;
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }

  function isConfigured(app) {
    return requiredIds(app).some((id) => id && !id.startsWith(PLACEHOLDER_PREFIX));
  }

  function userHasAccess(app, userGroups) {
    if (requiredIds(app).length === 0) return true; // app pública (cualquier autenticado)
    const set = new Set(userGroups.map((g) => g.toLowerCase()));
    const candidates = requiredIds(app).concat(app.requiredGroupName ? [app.requiredGroupName] : []);
    return candidates.some((c) => c && set.has(String(c).toLowerCase()));
  }

  /** 'open' | 'locked' | 'soon' */
  function appState(app, userGroups) {
    if (app.comingSoon) return 'soon';
    return userHasAccess(app, userGroups) ? 'open' : 'locked';
  }

  // --- Render ----------------------------------------------------------------
  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function cardMarkup(app, state, index) {
    const badge =
      state === 'soon'
        ? '<span class="card__badge card__badge--soon">' + svgIcon('clock') + 'Próximamente</span>'
        : state === 'locked'
        ? '<span class="card__badge card__badge--locked">' + svgIcon('lock') + 'Sin acceso</span>'
        : '<span class="card__badge card__badge--open">Disponible</span>';

    let footer;
    if (state === 'open') {
      footer = '<span class="card__cta">Abrir' + svgIcon('arrow', 'card__cta-arrow') + '</span>';
    } else if (state === 'soon') {
      footer = '<span class="card__hint">En preparación</span>';
    } else {
      footer =
        '<span class="card__hint">Solicita acceso al grupo <code>' +
        (app.requiredGroupName || '—') +
        '</code></span>';
    }

    return (
      '<span class="card__index">' +
      String(index + 1).padStart(2, '0') +
      '</span>' +
      '<div class="card__top">' +
      '<span class="card__icon">' +
      svgIcon(app.icon, 'card__icon-svg') +
      '</span>' +
      badge +
      '</div>' +
      '<h3 class="card__title">' +
      app.title +
      '</h3>' +
      '<p class="card__desc">' +
      app.description +
      '</p>' +
      '<div class="card__footer">' +
      footer +
      '</div>' +
      '<span class="card__veil" aria-hidden="true"></span>'
    );
  }

  function buildCard(app, state, index) {
    const accessible = state === 'open' && app.url;
    const tag = accessible ? 'a' : 'div';
    const card = el(tag, 'card card--' + state, cardMarkup(app, state, index));
    card.style.setProperty('--i', index);
    card.dataset.appId = app.id;
    if (accessible) {
      card.href = app.url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.setAttribute('aria-label', 'Abrir ' + app.title);
    } else {
      card.setAttribute('aria-disabled', 'true');
      const title =
        state === 'soon'
          ? app.title + ' — próximamente'
          : app.title + ' — sin acceso (grupo ' + (app.requiredGroupName || '') + ')';
      card.title = title;
    }
    return card;
  }

  function groupByCategory(apps) {
    const cfg = window.RUESMA_PORTAL || {};
    const order = cfg.categoryOrder || [];
    const buckets = {};
    apps.forEach((a) => {
      const key = a.category || 'Otros';
      (buckets[key] = buckets[key] || []).push(a);
    });
    const keys = Object.keys(buckets).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys.map((k) => ({ key: k, apps: buckets[k] }));
  }

  function renderCatalog(session) {
    const cfg = window.RUESMA_PORTAL || {};
    const apps = cfg.apps || [];
    const labels = cfg.categoryLabels || {};
    const root = document.getElementById('catalog');
    root.innerHTML = '';

    let globalIndex = 0;
    let openCount = 0;

    groupByCategory(apps).forEach((group) => {
      const section = el('section', 'cat');
      section.appendChild(
        el(
          'div',
          'cat__head',
          '<h2 class="cat__title">' +
            (labels[group.key] || group.key) +
            '</h2><span class="cat__rule"></span>' +
            '<span class="cat__count">' +
            group.apps.length +
            (group.apps.length === 1 ? ' app' : ' apps') +
            '</span>'
        )
      );
      const grid = el('div', 'grid');
      group.apps.forEach((app) => {
        const state = appState(app, session.groups);
        if (state === 'open' && app.url) openCount += 1;
        grid.appendChild(buildCard(app, state, globalIndex));
        globalIndex += 1;
      });
      section.appendChild(grid);
      root.appendChild(section);
    });

    updateSummary(session, apps.length, openCount);
    diagnostics(session, apps);
  }

  function updateSummary(session, total, openCount) {
    const summary = document.getElementById('summary');
    if (!summary) return;
    summary.textContent =
      'Tienes acceso a ' +
      openCount +
      ' de ' +
      total +
      (total === 1 ? ' aplicación' : ' aplicaciones') +
      '.';
  }

  // Ayuda al desarrollador: vuelca en consola los GUID de grupo del usuario y
  // avisa de catálogos sin configurar. No muestra nada al usuario final.
  function diagnostics(session, apps) {
    /* eslint-disable no-console */
    if (session.groups.length) {
      console.groupCollapsed(
        '%c[Portal Ruesma] Grupos Entra detectados',
        'color:#9f2842;font-weight:600'
      );
      session.groups.forEach((g) => console.log(g));
      console.info('Copia el GUID correspondiente en requiredGroupId dentro de catalog.js');
      console.groupEnd();
    } else if (session.authenticated) {
      console.warn(
        '[Portal Ruesma] El token no trae grupos. Configura groupMembershipClaims = SecurityGroup ' +
          'en la App Registration del portal.'
      );
    }
    const pending = apps.filter((a) => !a.comingSoon && !isConfigured(a)).map((a) => a.id);
    if (pending.length) {
      console.warn(
        '[Portal Ruesma] Apps con requiredGroupId placeholder (funcionan en dev por nombre, ' +
          'pero NO se desbloquearán en Azure hasta rellenar el GUID): ' +
          pending.join(', ')
      );
    }
    if (session.overage) {
      console.warn(
        '[Portal Ruesma] Claims overage: el usuario pertenece a demasiados grupos y Entra no los ' +
          'incluyó en el token. Habría que consultar Microsoft Graph (no implementado).'
      );
    }
    /* eslint-enable no-console */
  }

  // --- Header / sesión -------------------------------------------------------
  function renderUser(session) {
    const slot = document.getElementById('user-slot');
    if (!slot) return;
    const initials = (session.name || '?').slice(0, 2).toUpperCase();
    slot.innerHTML =
      '<div class="user">' +
      '<span class="user__avatar">' +
      initials +
      '</span>' +
      '<span class="user__meta"><span class="user__name">' +
      session.name +
      '</span><span class="user__mail">' +
      session.email +
      '</span></span>' +
      '<button class="user__logout" type="button" id="btn-logout" title="Cerrar sesión" aria-label="Cerrar sesión">Salir</button>' +
      '</div>';
    const btn = document.getElementById('btn-logout');
    if (btn) btn.addEventListener('click', () => window.RuesmaAuth.logout());
  }

  function showGate() {
    document.getElementById('app-shell').hidden = true;
    const gate = document.getElementById('gate');
    gate.hidden = false;
    document.getElementById('btn-login').addEventListener('click', () => window.RuesmaAuth.login());
  }

  function showApp() {
    document.getElementById('gate').hidden = true;
    document.getElementById('app-shell').hidden = false;
  }

  // --- Arranque --------------------------------------------------------------
  async function init() {
    const session = await window.RuesmaAuth.getSession();
    if (!session.authenticated) {
      showGate();
      return;
    }
    showApp();
    renderUser(session);
    renderCatalog(session);
    requestAnimationFrame(() => document.body.classList.add('is-ready'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
