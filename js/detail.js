/* ══════════════════════════════════════════
   DETAIL PAGE — detail.js
══════════════════════════════════════════ */

(function () {

  function init(id) {
    const game = DB.getGame(id);
    if (!game) { Router.navigate('/'); return; }
    render(game);
  }

  function render(game) {
    const page = document.getElementById('page-detail');
    if (!page) return;

    const coverHtml = game.cover
      ? `<img class="detail-cover" src="${game.cover}" alt="${Components.escHtml(game.title)}">`
      : `<div class="detail-cover-placeholder">🌸</div>`;

    const metaItems = [
      ['游戏公司', game.company],
      ['剧本', game.writer],
      ['原画', game.illustrator],
      ['发售年份', game.releaseDate],
    ].filter(([, v]) => v);

    const cgSrcs = (game.cgs || []).map(c => c.src);

    page.innerHTML = `
  <div class="container--narrow">
    <!-- Back / actions bar -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px" class="detail-actions-bar">
      <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/')">← 返回</button>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="DetailPage.exportPDF('${Components.escHtml(game.title).replace(/'/g, "\\'")}')">📥 导出 PDF</button>
        <button class="btn btn-outline btn-sm" onclick="Router.navigate('/edit/${game.id}')">✏️ 编辑</button>
        <button class="btn btn-danger btn-sm" onclick="Components.confirmDelete('${game.id}')">🗑️ 删除</button>
      </div>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      ${coverHtml}
      <div class="detail-info">
        <div class="detail-title">${Components.escHtml(game.title)}</div>

        <div style="display:flex;align-items:center;gap:12px;margin:10px 0">
          ${Components.renderStars(game.ratings?.overall || 0, { size: 'lg' })}
          <span style="font-size:1.1rem;font-weight:700;color:var(--primary)">${game.ratings?.overall || '-'}</span>
          ${Components.progressBadge(game.progress)}
        </div>

        <div class="detail-meta-grid">
          ${metaItems.map(([l, v]) => `
          <div class="detail-meta-item">
            <span class="label">${l}：</span>${Components.escHtml(v)}
          </div>`).join('')}
        </div>

        ${(game.tags || []).length ? `
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
          ${Components.renderTags(game.tags)}
        </div>` : ''}

        <hr class="divider" style="margin:16px 0">

        <div class="rating-bars">
          ${Components.renderRatingBars(game.ratings || {}, game.customRatings || [])}
        </div>
      </div>
    </div>

    <!-- Review text -->
    ${game.review ? `
    <div class="detail-review">
      <h3>📝 游戏总评</h3>
      <div class="review-text">${Components.escHtml(game.review)}</div>
    </div>` : ''}

    <!-- CG Gallery -->
    ${(game.cgs || []).length ? `
    <div style="margin-bottom:32px">
      <div class="section-heading"><h2>🖼️ 游戏 CG</h2></div>
      <div class="gallery-strip" id="detail-cg-strip">
        ${game.cgs.map((cg, i) =>
      `<img class="gallery-thumb" src="${cg.src}" alt="${Components.escHtml(cg.caption || '')}"
            data-gallery-idx="${i}" loading="lazy">`
    ).join('')}
      </div>
    </div>` : ''}

    <!-- Characters -->
    ${(game.characters || []).length ? `
    <div>
      <div class="section-heading"><h2>👤 角色</h2></div>
      <div style="display:flex;flex-direction:column;gap:14px" id="char-list">
        ${game.characters.map(c => Components.renderCharCard(c)).join('')}
      </div>
    </div>` : ''}

    <!-- Impressions -->
    ${(game.impressions || []).length ? `
    <div style="margin-top:32px">
      <div class="section-heading"><h2>✨ 角色印象 (初印象/现印象)</h2></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${game.impressions.map(imp => Components.renderImpressionCard(imp)).join('')}
      </div>
    </div>` : ''}

    <div style="height:40px"></div>
  </div>`;

    // Bind CG gallery clicks
    const cgStrip = page.querySelector('#detail-cg-strip');
    if (cgStrip) {
      cgStrip.querySelectorAll('.gallery-thumb').forEach((img, i) => {
        img.addEventListener('click', () => Components.openModal(cgSrcs, i));
      });
    }

    // Bind character CG clicks
    page.querySelectorAll('[data-cg-char]').forEach(img => {
      const charId = img.dataset.cgChar;
      const idx = parseInt(img.dataset.cgIdx);
      const char = (game.characters || []).find(c => c.id === charId);
      if (char) {
        img.addEventListener('click', () =>
          Components.openModal(char.cgs.map(c => c.src), idx)
        );
      }
    });
  }

  function exportPDF(title) {
    const page = document.getElementById('page-detail');
    if (!page) return;

    const actionsBar = page.querySelector('.detail-actions-bar');
    if (actionsBar) actionsBar.style.display = 'none';

    const opt = {
      margin: [10, 10],
      filename: `${title || '游戏Review'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(page).save().then(() => {
      if (actionsBar) actionsBar.style.display = 'flex';
    });
  }

  window.DetailPage = { init, exportPDF };

})();
