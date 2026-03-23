/* ══════════════════════════════════════════
   COMPONENTS — components.js
   Reusable render helpers, no page logic
══════════════════════════════════════════ */

// ── Stars ─────────────────────────────────
function renderStars(rating, { size = '', input = false, name = '', id = '' } = {}) {
  const cls = ['stars', size ? `stars--${size}` : '', input ? 'stars--input' : ''].join(' ').trim();
  if (input) {
    let html = `<span class="${cls}" data-rating-name="${name}">`;
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star${i <= (rating || 0) ? ' filled' : ''}" data-val="${i}" role="button">♥</span>`;
    }
    html += `<input type="hidden" name="${name}" value="${rating || 0}">`;
    html += `</span>`;
    return html;
  } else {
    let html = `<span class="${cls}">`;
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star${i <= rating ? ' filled' : ''}">♥</span>`;
    }
    html += `</span>`;
    return html;
  }
}

function bindStarInputs(container) {
  container.querySelectorAll('.stars--input').forEach(wrap => {
    const hidden = wrap.querySelector('input[type=hidden]');
    const stars  = wrap.querySelectorAll('.star');
    const setVal = (v) => {
      stars.forEach((s, i) => s.classList.toggle('filled', i < v));
      if (hidden) hidden.value = v;
    };
    stars.forEach((star, i) => {
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, j) => s.classList.toggle('hover', j <= i));
      });
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hover'));
      });
      star.addEventListener('click', () => setVal(i + 1));
    });
  });
}

// ── Progress badge ────────────────────────
function progressBadge(progress) {
  const map = { '未开始': '', '游玩中': '--green', '已通关': '--blue', '已全收': '--yellow' };
  const cls = map[progress] || '';
  return `<span class="badge badge${cls}">${progress || '未开始'}</span>`;
}

// ── Tags ──────────────────────────────────
function renderTags(tags = [], small = true) {
  if (!tags.length) return '';
  return tags.map(t => `<span class="tag tag--sm${small ? '' : ''}">${escHtml(t)}</span>`).join('');
}

// ── Game Card ─────────────────────────────
function renderGameCard(game) {
  const coverHtml = game.cover
    ? `<img class="game-card__cover" src="${game.cover}" alt="${escHtml(game.title)}" loading="lazy">`
    : `<div class="game-card__cover-placeholder">🌸</div>`;

  const tags = (game.tags || []).slice(0, 3).map(t =>
    `<span class="tag tag--sm">${escHtml(t)}</span>`
  ).join('');

  return `
  <article class="game-card" data-id="${game.id}" onclick="Router.navigate('/game/${game.id}')">
    ${coverHtml}
    <div class="game-card__body">
      <div class="game-card__title">${escHtml(game.title)}</div>
      <div class="game-card__meta">${escHtml(game.company || '')}</div>
      <div class="flex gap-sm" style="flex-wrap:wrap">${tags}</div>
      <div class="game-card__footer">
        <div style="display:flex;align-items:center;gap:8px">
          ${renderStars(game.ratings?.overall || 0, { size: 'sm' })}
          ${progressBadge(game.progress)}
        </div>
        <div class="game-card__actions" onclick="event.stopPropagation()">
          <button class="btn-icon" title="编辑" onclick="Router.navigate('/edit/${game.id}')">✏️</button>
          <button class="btn-icon" title="删除" onclick="Components.confirmDelete('${game.id}')">🗑️</button>
        </div>
      </div>
    </div>
  </article>`;
}

// ── Rating bars ───────────────────────────
const RATING_LABELS = [
  ['story',      '剧情'],
  ['characters', '角色'],
  ['art',        '美术/CG'],
  ['voice',      '声优'],
  ['emotion',    '情感共鸣'],
];
function renderRatingBars(ratings = {}) {
  return RATING_LABELS.map(([key, label]) => {
    const val = ratings[key] || 0;
    return `
    <div class="rating-bar-row">
      <span class="label">${label}</span>
      <div class="rating-bar-bg">
        <div class="rating-bar-fill" style="width:${val * 20}%"></div>
      </div>
      <span class="val">${val || '-'}</span>
    </div>`;
  }).join('');
}

// ── Gallery strip ─────────────────────────
function renderGalleryStrip(cgs = [], small = false) {
  if (!cgs.length) return '<span class="text-muted text-sm">暂无图片</span>';
  return cgs.map((cg, i) =>
    `<img class="gallery-thumb${small ? ' gallery-thumb--sm' : ''}" src="${cg.src}"
      alt="${escHtml(cg.caption || '')}"
      data-gallery-idx="${i}"
      loading="lazy">`
  ).join('');
}

// ── Image Modal ───────────────────────────
let _modalGallery = [];
let _modalIdx = 0;

function openModal(srcs, idx = 0) {
  _modalGallery = Array.isArray(srcs) ? srcs : [srcs];
  _modalIdx = idx;
  _renderModal();
}

function _renderModal() {
  document.getElementById('img-modal')?.remove();

  const src = _modalGallery[_modalIdx];
  const hasPrev = _modalIdx > 0;
  const hasNext = _modalIdx < _modalGallery.length - 1;

  const div = document.createElement('div');
  div.id = 'img-modal';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal-img-wrap" onclick="event.stopPropagation()">
      ${hasPrev ? `<button class="modal-nav modal-nav--prev" id="modal-prev">‹</button>` : ''}
      <img src="${src}" alt="">
      <button class="modal-close" id="modal-close">✕</button>
      ${hasNext ? `<button class="modal-nav modal-nav--next" id="modal-next">›</button>` : ''}
    </div>`;

  div.addEventListener('click', closeModal);
  div.querySelector('#modal-close')?.addEventListener('click', closeModal);
  div.querySelector('#modal-prev')?.addEventListener('click', (e) => {
    e.stopPropagation(); _modalIdx--; _renderModal();
  });
  div.querySelector('#modal-next')?.addEventListener('click', (e) => {
    e.stopPropagation(); _modalIdx++; _renderModal();
  });

  document.body.appendChild(div);

  const onKey = (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft'  && _modalIdx > 0) { _modalIdx--; _renderModal(); }
    if (e.key === 'ArrowRight' && _modalIdx < _modalGallery.length - 1) { _modalIdx++; _renderModal(); }
  };
  document.addEventListener('keydown', onKey, { once: true });
  div._keyHandler = onKey;
}

function closeModal() {
  const m = document.getElementById('img-modal');
  if (m) {
    document.removeEventListener('keydown', m._keyHandler);
    m.remove();
  }
}

// ── Character card (detail view) ─────────
function renderCharCard(char) {
  const portrait = char.portrait
    ? `<img class="char-portrait" src="${char.portrait}" alt="${escHtml(char.name)}">`
    : `<div class="char-portrait-placeholder">👤</div>`;

  const cgSrcs = (char.cgs || []).map(c => c.src);
  const cgStrip = char.cgs?.length
    ? char.cgs.map((cg, i) =>
        `<img class="gallery-thumb gallery-thumb--sm" src="${cg.src}"
          data-cg-char="${char.id}" data-cg-idx="${i}" loading="lazy">`
      ).join('')
    : '';

  return `
  <div class="char-card" data-char-id="${char.id}">
    <div class="char-card__header" onclick="Components.toggleChar(this)">
      ${portrait}
      <div class="char-card__summary">
        <div class="char-card__name">${escHtml(char.name)}</div>
        <div style="display:flex;align-items:center;gap:8px;margin:3px 0">
          ${renderStars(char.rating, { size: 'sm' })}
        </div>
        <div class="char-card__short">${escHtml(char.shortComment || '')}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:160px;justify-content:flex-end">
        ${renderTags(char.tags || [])}
      </div>
      <span class="char-card__toggle">▾</span>
    </div>
    <div class="char-card__body">
      <div class="char-card__content">
        ${char.fullReview ? `<p class="char-full-review">${escHtml(char.fullReview)}</p>` : ''}
        ${cgStrip ? `<div class="gallery-strip mt-md" data-char-cgs="${char.id}">${cgStrip}</div>` : ''}
      </div>
    </div>
  </div>`;
}

function toggleChar(headerEl) {
  headerEl.closest('.char-card').classList.toggle('expanded');
}

// ── Confirm delete ────────────────────────
function confirmDelete(id) {
  const game = DB.getGame(id);
  if (!game) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3>确认删除</h3>
      <p>确定要删除《${escHtml(game.title)}》吗？此操作无法撤销。</p>
      <div class="btn-row">
        <button class="btn btn-ghost" id="confirm-cancel">取消</button>
        <button class="btn btn-danger" id="confirm-ok">删除</button>
      </div>
    </div>`;
  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick = () => {
    DB.deleteGame(id);
    overlay.remove();
    showToast('已删除');
    if (location.hash.includes('/game/') || location.hash.includes('/edit/')) {
      Router.navigate('/');
    } else {
      window.HomePage?.render();
    }
  };
  document.body.appendChild(overlay);
}

// ── Toast ─────────────────────────────────
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ` ${type}` : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ── FileReader helper ─────────────────────
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Escape HTML ───────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Exports ───────────────────────────────
window.Components = {
  renderStars, bindStarInputs,
  progressBadge, renderTags,
  renderGameCard, renderRatingBars,
  renderGalleryStrip, openModal, closeModal,
  renderCharCard, toggleChar,
  confirmDelete, showToast,
  readImageFile, escHtml,
  RATING_LABELS,
};
