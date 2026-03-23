/* ══════════════════════════════════════════
   ROUTER — router.js
   Simple hash-based page switcher
   Routes: #/  #/add  #/edit/:id  #/game/:id
══════════════════════════════════════════ */

const ROUTES = [
  { pattern: /^\/$|^$/, page: 'page-home',   init: () => window.HomePage?.init() },
  { pattern: /^\/add$/,          page: 'page-form',   init: () => window.FormPage?.init(null) },
  { pattern: /^\/edit\/(.+)$/,   page: 'page-form',   init: (m) => window.FormPage?.init(m[1]) },
  { pattern: /^\/game\/(.+)$/,   page: 'page-detail', init: (m) => window.DetailPage?.init(m[1]) },
];

function getHash() {
  return location.hash.replace(/^#/, '') || '/';
}

function navigate(path) {
  location.hash = '#' + path;
}

function resolve() {
  const hash = getHash();
  let matched = false;

  for (const route of ROUTES) {
    const m = hash.match(route.pattern);
    if (m) {
      showPage(route.page);
      route.init(m);
      matched = true;
      break;
    }
  }

  if (!matched) {
    navigate('/');
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    window.scrollTo({ top: 0 });
  }
}

window.addEventListener('hashchange', resolve);
window.addEventListener('DOMContentLoaded', resolve);

window.Router = { navigate, resolve };
