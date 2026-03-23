/* ══════════════════════════════════════════
   FORM PAGE — form.js
   Add / Edit game form
══════════════════════════════════════════ */

(function () {

  let _editId = null;   // null = new game
  let _game = null;   // current working copy
  let _charForms = [];     // array of char form state objects
  let _customRatings = [];
  let _impressions = [];   // array of impression state objects

  // ── Init ──────────────────────────────────
  function init(id) {
    _editId = id || null;
    _game = id ? DB.getGame(id) : DB.newGame();
    if (!_game) { Router.navigate('/'); return; }

    _charForms = (_game.characters || []).map(c => ({
      ...c,
      _cgs: [...(c.cgs || [])],
      _collapsed: true,
    }));
    _customRatings = (_game.customRatings || []).map(cr => ({ ...cr }));
    _impressions = (_game.impressions || []).map(imp => ({ ...imp, _collapsed: false }));

    renderPage();
  }

  // ── Render shell ──────────────────────────
  function renderPage() {
    const page = document.getElementById('page-form');
    if (!page) return;

    const title = _editId ? `编辑《${Components.escHtml(_game.title || '')}》` : '添加新游戏';

    page.innerHTML = `
  <div class="container--narrow form-page">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
      <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/')">← 返回</button>
      <h1 style="font-size:1.3rem">${title}</h1>
    </div>

    <!-- 基本信息 -->
    <div class="form-section">
      <div class="form-section-title">🌸 基本信息</div>
      <div class="form-cover-upload">
        <div id="cover-wrap"></div>
        <div style="flex:1">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">游戏名称<span class="required">*</span></label>
              <input type="text" id="f-title" value="${Components.escHtml(_game.title)}" placeholder="请输入游戏名称">
            </div>
            <div class="form-group">
              <label class="form-label">游戏公司</label>
              <input type="text" id="f-company" value="${Components.escHtml(_game.company)}" placeholder="开发/发行商">
            </div>
            <div class="form-group">
              <label class="form-label">剧本/编剧</label>
              <input type="text" id="f-writer" value="${Components.escHtml(_game.writer)}" placeholder="剧本作者">
            </div>
            <div class="form-group">
              <label class="form-label">原画/插画师</label>
              <input type="text" id="f-illustrator" value="${Components.escHtml(_game.illustrator)}" placeholder="美术/原画">
            </div>
            <div class="form-group">
              <label class="form-label">发售年份</label>
              <input type="number" id="f-date" min="1980" max="2099" step="1" placeholder="例如：2023" value="${_game.releaseDate || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">游玩进度</label>
              <select id="f-progress">
                ${['未开始', '游玩中', '已通关', '已全收'].map(p =>
      `<option value="${p}"${_game.progress === p ? ' selected' : ''}>${p}</option>`
    ).join('')}
              </select>
            </div>
          </div>
          <!-- Tags -->
          <div class="form-group mt-md">
            <label class="form-label">游戏标签</label>
            <div class="tag-input-wrap" id="tag-wrap">
              <div class="tag-input-row">
                <input type="text" id="tag-input" placeholder="输入标签后按 Enter 添加">
                <button class="btn btn-ghost btn-sm" onclick="FormPage._addTag()">添加</button>
              </div>
              <div class="tag-list" id="tag-list"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 评分 -->
    <div class="form-section">
      <div class="form-section-title">⭐ 综合评分</div>
      ${renderRatingSection()}
    </div>

    <!-- 评测文本 -->
    <div class="form-section">
      <div class="form-section-title">📝 游戏总评</div>
      <textarea id="f-review" rows="6" placeholder="写下你对这部游戏的整体感受...">${Components.escHtml(_game.review)}</textarea>
    </div>

    <!-- CG 图库 -->
    <div class="form-section">
      <div class="form-section-title">🖼️ 游戏 CG 图库</div>
      <div class="gallery-strip" id="game-cg-strip"></div>
      <div style="margin-top:12px">
        <label class="upload-btn">
          ＋ 上传 CG 图片
          <input type="file" accept="image/*" multiple style="display:none" id="game-cg-input">
        </label>
      </div>
    </div>

    <!-- 角色 -->
    <div class="form-section">
      <div class="form-section-title">👤 角色</div>
      <div id="char-forms-container"></div>
      <button class="btn btn-outline btn-sm mt-md" onclick="FormPage._addChar()">＋ 添加角色</button>
    </div>

    <!-- 角色印象 -->
    <div class="form-section">
      <div class="form-section-title">✨ 角色印象</div>
      <div id="impression-forms-container"></div>
      <button class="btn btn-outline btn-sm mt-md" onclick="FormPage._addImpression()">＋ 添加印象</button>
    </div>

    <!-- Spacer for sticky footer -->
    <div style="height:20px"></div>
  </div>

  <!-- Sticky footer -->
  <div class="form-sticky-footer">
    <button class="btn btn-ghost" onclick="Router.navigate('/')">取消</button>
    <button class="btn btn-primary" onclick="FormPage._save()">💾 保存游戏</button>
  </div>
  `;

    renderCoverWidget();
    renderTagList();
    renderGameCGStrip();
    renderCharForms();
    renderImpressions();
    renderCustomRatings();
    bindRatingInputs();
    bindTagInput();
    bindGameCGInput();
  }

  // ── Cover widget ──────────────────────────
  function renderCoverWidget() {
    const wrap = document.getElementById('cover-wrap');
    if (!wrap) return;
    if (_game.cover) {
      wrap.innerHTML = `
      <div style="position:relative;display:inline-block">
        <img class="form-cover-preview" id="cover-preview" src="${_game.cover}" alt="封面">
        <button class="remove-img" style="position:absolute;top:-7px;right:-7px" onclick="FormPage._removeCover()">✕</button>
      </div>
      <input type="file" accept="image/*" id="cover-input" style="display:none">`;
      wrap.querySelector('#cover-preview').onclick = () => wrap.querySelector('#cover-input').click();
    } else {
      wrap.innerHTML = `
      <label class="cover-placeholder" for="cover-input">
        <span class="icon">📷</span>
        <span>点击上传封面</span>
      </label>
      <input type="file" accept="image/*" id="cover-input" style="display:none">`;
    }
    wrap.querySelector('#cover-input').addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      _game.cover = await Components.readImageFile(file);
      renderCoverWidget();
    });
  }

  function _removeCover() {
    _game.cover = '';
    renderCoverWidget();
  }

  // ── Ratings ───────────────────────────────
  function renderRatingSection() {
    const labels = [
      ['overall', '综合评分'],
      ['story', '剧情'],
      ['characters', '角色'],
      ['art', '美术/CG'],
      ['voice', '声优'],
      ['emotion', '情感共鸣'],
    ];
    return `
  <div style="display:flex;flex-wrap:wrap;gap:20px 32px">
    ${labels.map(([key, label]) => `
    <div class="rating-input-item">
      <span class="label">${label}</span>
      ${Components.renderStars(_game.ratings?.[key] || 0, { input: true, name: `rating-${key}` })}
    </div>`).join('')}
    
    <div id="custom-ratings-container" style="display:contents"></div>
  </div>

  <div style="margin-top:20px;display:flex;gap:10px;align-items:center;max-width:320px">
    <input type="text" id="cr-input" placeholder="输入自定义评分维度 (如：音乐)" style="flex:1">
    <button class="btn btn-outline btn-sm" onclick="FormPage._addCustomRating()" style="white-space:nowrap">＋ 添加维度</button>
  </div>`;
  }

  function bindRatingInputs() {
    const page = document.getElementById('page-form');
    if (!page) return;
    Components.bindStarInputs(page);
  }

  function renderCustomRatings() {
    const container = document.getElementById('custom-ratings-container');
    if (!container) return;
    container.innerHTML = _customRatings.map((cr, i) => `
    <div class="rating-input-item" style="position:relative">
      <span class="label">${Components.escHtml(cr.label)}
        <button class="remove-img" style="position:absolute;top:-8px;right:-14px;width:18px;height:18px;font-size:0.7rem;" onclick="FormPage._removeCustomRating(${i})">✕</button>
      </span>
      ${Components.renderStars(cr.rating || 0, { input: true, name: `cr-rating-${i}` })}
    </div>`).join('');
    Components.bindStarInputs(container);
  }

  function _syncCustomRatings() {
    _customRatings.forEach((cr, i) => {
      const h = document.querySelector(`[name="cr-rating-${i}"]`);
      if (h) cr.rating = parseInt(h.value) || 0;
    });
  }

  function _addCustomRating() {
    const input = document.getElementById('cr-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    _syncCustomRatings();
    _customRatings.push({ label: val, rating: 0 });
    renderCustomRatings();
    input.value = '';
  }

  function _removeCustomRating(i) {
    _syncCustomRatings();
    _customRatings.splice(i, 1);
    renderCustomRatings();
  }

  // ── Tags ──────────────────────────────────
  function renderTagList() {
    const list = document.getElementById('tag-list');
    if (!list) return;
    list.innerHTML = (_game.tags || []).map((t, i) =>
      `<span class="tag-removable">${Components.escHtml(t)}<span class="remove" data-ti="${i}">✕</span></span>`
    ).join('');
    list.querySelectorAll('.remove').forEach(el => {
      el.addEventListener('click', () => {
        _game.tags.splice(parseInt(el.dataset.ti), 1);
        renderTagList();
      });
    });
  }

  function bindTagInput() {
    const input = document.getElementById('tag-input');
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); _addTag(); }
    });
  }

  function _addTag() {
    const input = document.getElementById('tag-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!(_game.tags || []).includes(val)) {
      _game.tags = [...(_game.tags || []), val];
      renderTagList();
    }
    input.value = '';
  }

  // ── Game CGs ──────────────────────────────
  function renderGameCGStrip() {
    const strip = document.getElementById('game-cg-strip');
    if (!strip) return;
    strip.innerHTML = (_game.cgs || []).map((cg, i) => `
    <div class="gallery-upload-item">
      <img class="gallery-thumb" src="${cg.src}" alt="" onclick="Components.openModal(${JSON.stringify((_game.cgs || []).map(c => c.src))}, ${i})">
      <button class="remove-img" data-cgi="${i}">✕</button>
    </div>`
    ).join('');
    strip.querySelectorAll('[data-cgi]').forEach(btn => {
      btn.addEventListener('click', () => {
        _game.cgs.splice(parseInt(btn.dataset.cgi), 1);
        renderGameCGStrip();
      });
    });
  }

  function bindGameCGInput() {
    const input = document.getElementById('game-cg-input');
    if (!input) return;
    input.addEventListener('change', async (e) => {
      const files = [...e.target.files];
      for (const f of files) {
        const src = await Components.readImageFile(f);
        (_game.cgs = _game.cgs || []).push(DB.newCGImage(src));
      }
      renderGameCGStrip();
      input.value = '';
    });
  }

  // ── Character forms ───────────────────────
  function renderCharForms() {
    const container = document.getElementById('char-forms-container');
    if (!container) return;
    if (!_charForms.length) {
      container.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:12px 0">暂无角色，点击下方按钮添加</p>`;
      return;
    }
    container.innerHTML = _charForms.map((c, i) => charFormHTML(c, i)).join('');

    // Bind all char form events
    _charForms.forEach((_, i) => bindCharForm(i));
  }

  function charFormHTML(c, i) {
    return `
  <div class="char-form-block" id="char-block-${i}">
    <div class="char-form-block__header" onclick="FormPage._toggleCharForm(${i})">
      <span class="char-form-block__title">👤 ${Components.escHtml(c.name) || `角色 ${i + 1}`}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FormPage._removeChar(${i})">🗑️ 移除</button>
        <span style="color:var(--text-muted);font-size:.9rem">${c._collapsed ? '▾' : '▴'}</span>
      </div>
    </div>
    <div class="char-form-body" style="display:${c._collapsed ? 'none' : 'block'}">
      <div class="char-form-portrait-row">
        <div id="char-portrait-wrap-${i}"></div>
        <div style="flex:1">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">角色名称</label>
              <input type="text" id="char-name-${i}" value="${Components.escHtml(c.name)}" placeholder="角色名">
            </div>
            <div class="form-group">
              <label class="form-label">角色评分</label>
              <div style="padding:4px 0">${Components.renderStars(c.rating, { input: true, name: `char-rating-${i}` })}</div>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">角色标签（用 Enter 添加）</label>
              <div class="tag-input-wrap">
                <div class="tag-input-row">
                  <input type="text" id="char-tag-input-${i}" placeholder="如：攻略线、弓道部、傲娇...">
                  <button class="btn btn-ghost btn-sm" onclick="FormPage._addCharTag(${i})">添加</button>
                </div>
                <div class="tag-list" id="char-tag-list-${i}"></div>
              </div>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">一句话短评</label>
              <input type="text" id="char-short-${i}" value="${Components.escHtml(c.shortComment)}" placeholder="简短的印象描述">
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">详细评价</label>
              <textarea id="char-review-${i}" rows="4" placeholder="详细写下对这个角色的感受...">${Components.escHtml(c.fullReview)}</textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Char CGs -->
      <div class="form-group mt-md">
        <label class="form-label">角色 CG</label>
        <div class="gallery-strip" id="char-cg-strip-${i}" style="margin-bottom:8px"></div>
        <label class="upload-btn">
          ＋ 上传角色 CG
          <input type="file" accept="image/*" multiple style="display:none" id="char-cg-input-${i}">
        </label>
      </div>
    </div>
  </div>`;
  }

  function bindCharForm(i) {
    const c = _charForms[i];

    // Portrait
    const portraitWrap = document.getElementById(`char-portrait-wrap-${i}`);
    if (portraitWrap) _renderCharPortrait(i);

    // Star input
    const block = document.getElementById(`char-block-${i}`);
    if (block) Components.bindStarInputs(block);

    // Tags
    _renderCharTagList(i);
    const tagInput = document.getElementById(`char-tag-input-${i}`);
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); _addCharTag(i); }
      });
    }

    // CG strip
    _renderCharCGStrip(i);
    const cgInput = document.getElementById(`char-cg-input-${i}`);
    if (cgInput) {
      cgInput.addEventListener('change', async (e) => {
        for (const f of [...e.target.files]) {
          const src = await Components.readImageFile(f);
          (_charForms[i]._cgs = _charForms[i]._cgs || []).push(DB.newCGImage(src));
        }
        _renderCharCGStrip(i);
        cgInput.value = '';
      });
    }
  }

  function _renderCharPortrait(i) {
    const wrap = document.getElementById(`char-portrait-wrap-${i}`);
    if (!wrap) return;
    const c = _charForms[i];
    if (c.portrait) {
      wrap.innerHTML = `
      <div style="position:relative;display:inline-block">
        <img class="char-portrait-preview" id="char-portrait-img-${i}" src="${c.portrait}">
        <button class="remove-img" onclick="FormPage._removeCharPortrait(${i})">✕</button>
      </div>
      <input type="file" accept="image/*" id="char-portrait-input-${i}" style="display:none">`;
      wrap.querySelector(`#char-portrait-img-${i}`).onclick = () => wrap.querySelector(`#char-portrait-input-${i}`).click();
    } else {
      wrap.innerHTML = `
      <label class="char-portrait-placeholder" for="char-portrait-input-${i}">👤</label>
      <input type="file" accept="image/*" id="char-portrait-input-${i}" style="display:none">`;
    }
    wrap.querySelector(`#char-portrait-input-${i}`).addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      _charForms[i].portrait = await Components.readImageFile(file);
      _renderCharPortrait(i);
    });
  }

  function _removeCharPortrait(i) {
    _charForms[i].portrait = '';
    _renderCharPortrait(i);
  }

  function _renderCharTagList(i) {
    const list = document.getElementById(`char-tag-list-${i}`);
    if (!list) return;
    list.innerHTML = (_charForms[i].tags || []).map((t, j) =>
      `<span class="tag-removable">${Components.escHtml(t)}<span class="remove" data-j="${j}">✕</span></span>`
    ).join('');
    list.querySelectorAll('.remove').forEach(el => {
      el.addEventListener('click', () => {
        _charForms[i].tags.splice(parseInt(el.dataset.j), 1);
        _renderCharTagList(i);
      });
    });
  }

  function _addCharTag(i) {
    const input = document.getElementById(`char-tag-input-${i}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    if (!(_charForms[i].tags || []).includes(val)) {
      _charForms[i].tags = [...(_charForms[i].tags || []), val];
      _renderCharTagList(i);
    }
    input.value = '';
  }

  function _renderCharCGStrip(i) {
    const strip = document.getElementById(`char-cg-strip-${i}`);
    if (!strip) return;
    const cgs = _charForms[i]._cgs || [];
    strip.innerHTML = cgs.map((cg, ci) => `
    <div class="gallery-upload-item">
      <img class="gallery-thumb gallery-thumb--sm" src="${cg.src}"
        onclick="Components.openModal(${JSON.stringify(cgs.map(c => c.src))}, ${ci})">
      <button class="remove-img" data-ci="${ci}">✕</button>
    </div>`
    ).join('');
    strip.querySelectorAll('[data-ci]').forEach(btn => {
      btn.addEventListener('click', () => {
        _charForms[i]._cgs.splice(parseInt(btn.dataset.ci), 1);
        _renderCharCGStrip(i);
      });
    });
  }

  function _toggleCharForm(i) {
    _charForms[i]._collapsed = !_charForms[i]._collapsed;
    // Sync inputs before collapsing
    _syncCharInputs(i);
    const block = document.getElementById(`char-block-${i}`);
    if (!block) return;
    const body = block.querySelector('.char-form-body');
    const arrow = block.querySelector('.char-form-block__header span:last-child');
    if (body) body.style.display = _charForms[i]._collapsed ? 'none' : 'block';
    if (arrow) arrow.textContent = _charForms[i]._collapsed ? '▾' : '▴';
    const titleEl = block.querySelector('.char-form-block__title');
    if (titleEl) {
      const name = document.getElementById(`char-name-${i}`)?.value || `角色 ${i + 1}`;
      titleEl.textContent = `👤 ${name}`;
    }
  }

  function _addChar() {
    _collectAllInputs();
    const c = { ...DB.newCharacter(), _cgs: [], _collapsed: false };
    _charForms.push(c);
    renderCharForms();
  }

  function _removeChar(i) {
    _charForms.splice(i, 1);
    renderCharForms();
  }

  // ── Impression forms ────────────────────
  function renderImpressions() {
    const container = document.getElementById('impression-forms-container');
    if (!container) return;
    if (!_impressions.length) {
      container.innerHTML = `<p class="text-muted text-sm" style="text-align:center;padding:12px 0">暂无印象记录，点击下方按钮添加</p>`;
      return;
    }
    
    container.innerHTML = `
    <table class="impression-table">
      <thead>
        <tr>
          <th style="width:20%;text-align:center;">角色</th>
          <th style="width:38%">before</th>
          <th style="width:38%">after</th>
          <th style="width:4%;text-align:center"></th>
        </tr>
      </thead>
      <tbody>
        ${_impressions.map((imp, i) => impressionFormRow(imp, i)).join('')}
      </tbody>
    </table>`;

    _impressions.forEach((_, i) => _renderImpressionPortrait(i));
  }

  function impressionFormRow(imp, i) {
    return `
    <tr id="imp-row-${i}">
      <td style="text-align:center;vertical-align:middle;">
        <div id="imp-portrait-wrap-${i}" style="display:flex;justify-content:center;"></div>
      </td>
      <td>
        <textarea id="imp-before-${i}" rows="2" placeholder="初印象..." oninput="FormPage._syncImpressionInputs(${i})">${Components.escHtml(imp.before)}</textarea>
      </td>
      <td>
        <textarea id="imp-after-${i}" rows="2" placeholder="现印象..." oninput="FormPage._syncImpressionInputs(${i})">${Components.escHtml(imp.after)}</textarea>
      </td>
      <td style="text-align:center;vertical-align:middle;">
        <button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="FormPage._removeImpression(${i})">✕</button>
      </td>
    </tr>`;
  }

  function _renderImpressionPortrait(i) {
    const wrap = document.getElementById(`imp-portrait-wrap-${i}`);
    if (!wrap) return;
    const imp = _impressions[i];
    if (imp.portrait) {
      wrap.innerHTML = `
      <div style="position:relative;display:inline-block">
        <img class="char-portrait-preview" id="imp-portrait-img-${i}" src="${imp.portrait}">
        <button class="remove-img" onclick="FormPage._removeImpressionPortrait(${i})">✕</button>
      </div>
      <input type="file" accept="image/*" id="imp-portrait-input-${i}" style="display:none">`;
      wrap.querySelector(`#imp-portrait-img-${i}`).onclick = () => wrap.querySelector(`#imp-portrait-input-${i}`).click();
    } else {
      wrap.innerHTML = `
      <label class="char-portrait-placeholder" for="imp-portrait-input-${i}">👤</label>
      <input type="file" accept="image/*" id="imp-portrait-input-${i}" style="display:none">`;
    }
    wrap.querySelector(`#imp-portrait-input-${i}`).addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      _impressions[i].portrait = await Components.readImageFile(file);
      _renderImpressionPortrait(i);
    });
  }

  function _removeImpressionPortrait(i) {
    _impressions[i].portrait = '';
    _renderImpressionPortrait(i);
  }

  function _addImpression() {
    _collectAllInputs();
    const imp = { ...DB.newImpression(), _collapsed: false };
    _impressions.push(imp);
    renderImpressions();
  }

  function _removeImpression(i) {
    _impressions.splice(i, 1);
    renderImpressions();
  }

  // ── Collect / sync ────────────────────────
  function _syncImpressionInputs(i) {
    const imp = _impressions[i];
    imp.before = document.getElementById(`imp-before-${i}`)?.value || '';
    imp.after = document.getElementById(`imp-after-${i}`)?.value || '';
  }

  function _syncCharInputs(i) {
    const c = _charForms[i];
    c.name = document.getElementById(`char-name-${i}`)?.value || '';
    c.shortComment = document.getElementById(`char-short-${i}`)?.value || '';
    c.fullReview = document.getElementById(`char-review-${i}`)?.value || '';
    const ratingHidden = document.querySelector(`[name="char-rating-${i}"]`);
    c.rating = ratingHidden ? parseInt(ratingHidden.value) || 0 : 0;
  }

  function _collectAllInputs() {
    // Game fields
    _game.title = document.getElementById('f-title')?.value.trim() || '';
    _game.company = document.getElementById('f-company')?.value.trim() || '';
    _game.writer = document.getElementById('f-writer')?.value.trim() || '';
    _game.illustrator = document.getElementById('f-illustrator')?.value.trim() || '';
    _game.releaseDate = document.getElementById('f-date')?.value || '';
    _game.progress = document.getElementById('f-progress')?.value || '未开始';
    _game.review = document.getElementById('f-review')?.value || '';

    // Ratings
    Components.RATING_LABELS.forEach(([key]) => {
      const h = document.querySelector(`[name="rating-${key}"]`);
      if (h) _game.ratings[key] = parseInt(h.value) || 0;
    });
    const overallH = document.querySelector('[name="rating-overall"]');
    if (overallH) _game.ratings.overall = parseInt(overallH.value) || 0;

    _syncCustomRatings();
    _game.customRatings = _customRatings;

    // Characters
    _charForms.forEach((_, i) => _syncCharInputs(i));

    // Impressions
    _impressions.forEach((_, i) => _syncImpressionInputs(i));
  }

  // ── Save ──────────────────────────────────
  function _save() {
    _collectAllInputs();

    if (!_game.title.trim()) {
      Components.showToast('请填写游戏名称', 'error');
      return;
    }

    // Build characters
    _game.characters = _charForms.map(c => ({
      id: c.id || DB.genId(),
      name: c.name,
      portrait: c.portrait || '',
      tags: c.tags || [],
      rating: c.rating || 0,
      shortComment: c.shortComment || '',
      fullReview: c.fullReview || '',
      cgs: c._cgs || [],
    }));

    // Build impressions
    _game.impressions = _impressions.map(imp => ({
      id: imp.id || DB.genId(),
      name: imp.name,
      portrait: imp.portrait || '',
      before: imp.before,
      after: imp.after,
    }));

    const saved = DB.saveGame(_game);
    if (saved) {
      Components.showToast(_editId ? '游戏已更新 ✓' : '游戏已保存 ✓');
      Router.navigate('/game/' + saved.id);
    } else {
      Components.showToast('保存失败，存储空间可能不足', 'error');
    }
  }

  window.FormPage = {
    init,
    _save, _addTag, _addChar, _removeChar,
    _toggleCharForm, _addCharTag,
    _removeCover, _removeCharPortrait, _removeImpressionPortrait,
    _addCustomRating, _removeCustomRating,
    _addImpression, _removeImpression,
  };

})();
