/* ══════════════════════════════════════════
   HOME PAGE — home.js
══════════════════════════════════════════ */

(function () {

  let _searchQuery = '';
  let _activeTag = '';
  let _activeProgress = '';

  const PROGRESS_OPTIONS = ['未开始', '游玩中', '自推全收集', 'HE全收集', '自推HE全收集', '全收集'];

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

    let html = `<div style="display:flex; gap:16px; align-items:center;">`;

    // Progress Select
    html += `<div style="display:flex; align-items:center; gap:8px;">`;
    html += `<span class="filter-bar__label">进度：</span>`;
    html += `<select id="filter-progress" class="form-select" style="min-width:110px;">`;
    html += `<option value="">全部</option>`;
    PROGRESS_OPTIONS.forEach(p => {
      html += `<option value="${p}" ${p === _activeProgress ? 'selected' : ''}>${p}</option>`;
    });
    html += `</select></div>`;

    // Tags Select removed as requested

    html += `</div>`;
    bar.innerHTML = html;

    const progSelect = bar.querySelector('#filter-progress');
    if (progSelect) {
      progSelect.addEventListener('change', (e) => {
        _activeProgress = e.target.value;
        renderFilterBar();
        renderGrid();
      });
    }

    // tag select listener removed
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

  // ── Search & Reviewer binding ──────────────
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

  function bindReviewer() {
    const revInput = document.getElementById('reviewer-name');
    if (!revInput) return;
    revInput.value = DB.getReviewer();
    revInput.addEventListener('input', (e) => {
      DB.setReviewer(e.target.value);
    });
  }

  function init() {
    render();
    bindSearch();
    bindReviewer();
  }

  window.HomePage = { init, render };

})();
