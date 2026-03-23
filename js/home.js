/* ══════════════════════════════════════════
   HOME PAGE — home.js
══════════════════════════════════════════ */

(function() {

let _searchQuery  = '';
let _activeTag    = '';
let _activeProgress = '';

const PROGRESS_OPTIONS = ['未开始', '游玩中', '已通关', '已全收'];

function init() {
  render();
  bindSearch();
}

function render() {
  renderFilterBar();
  renderGrid();
}

// ── Filter bar ────────────────────────────
function renderFilterBar() {
  const bar = document.getElementById('home-filter-bar');
  if (!bar) return;

  const tags = DB.getAllTags();

  let html = `<span class="filter-bar__label">进度：</span>`;
  html += `<span class="tag${!_activeProgress ? ' active' : ''}" data-filter-progress="">全部</span>`;
  PROGRESS_OPTIONS.forEach(p => {
    html += `<span class="tag${_activeProgress === p ? ' active' : ''}" data-filter-progress="${p}">${p}</span>`;
  });

  if (tags.length) {
    html += `<span class="filter-bar__label" style="margin-left:10px">标签：</span>`;
    html += `<span class="tag${!_activeTag ? ' active' : ''}" data-filter-tag="">全部</span>`;
    tags.forEach(t => {
      html += `<span class="tag${_activeTag === t ? ' active' : ''}" data-filter-tag="${Components.escHtml(t)}">${Components.escHtml(t)}</span>`;
    });
  }

  bar.innerHTML = html;

  bar.querySelectorAll('[data-filter-progress]').forEach(el => {
    el.addEventListener('click', () => {
      _activeProgress = el.dataset.filterProgress;
      renderFilterBar();
      renderGrid();
    });
  });
  bar.querySelectorAll('[data-filter-tag]').forEach(el => {
    el.addEventListener('click', () => {
      _activeTag = el.dataset.filterTag;
      renderFilterBar();
      renderGrid();
    });
  });
}

// ── Grid ──────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('home-game-grid');
  if (!grid) return;

  let games = DB.getAllGames();

  // Search
  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    games = games.filter(g =>
      (g.title || '').toLowerCase().includes(q) ||
      (g.company || '').toLowerCase().includes(q) ||
      (g.writer || '').toLowerCase().includes(q)
    );
  }

  // Progress filter
  if (_activeProgress) {
    games = games.filter(g => g.progress === _activeProgress);
  }

  // Tag filter
  if (_activeTag) {
    games = games.filter(g =>
      (g.tags || []).includes(_activeTag) ||
      (g.characters || []).some(c => (c.tags || []).includes(_activeTag))
    );
  }

  // Stats header
  const statsEl = document.getElementById('home-stats');
  if (statsEl) {
    const all = DB.getAllGames();
    statsEl.innerHTML = `
      <span class="text-muted text-sm">共 <strong>${all.length}</strong> 部游戏</span>
      ${_searchQuery || _activeTag || _activeProgress
        ? `<span class="text-muted text-sm">· 筛选结果 <strong>${games.length}</strong> 部</span>` : ''}
    `;
  }

  if (!games.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🌸</div>
        <p>${DB.getAllGames().length === 0 ? '还没有游戏记录，点击右上角「添加游戏」开始吧！' : '没有符合条件的游戏'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = games.map(g => Components.renderGameCard(g)).join('');
}

// ── Search binding ────────────────────────
function bindSearch() {
  const searchInput = document.getElementById('navbar-search');
  if (!searchInput) return;
  // Debounced
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      _searchQuery = searchInput.value.trim();
      renderGrid();
    }, 240);
  });
}

window.HomePage = { init, render };

})();
