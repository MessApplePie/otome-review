/* ══════════════════════════════════════════
   SETTINGS PAGE — settings.js
   Handles File System API connections
══════════════════════════════════════════ */

window.SettingsPage = (function () {
  let _dirHandle = null;

  async function handleSelectFolder() {
    try {
      _dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      render();
      Components.showToast('文件夹已连接 ✓');
    } catch (e) {
      console.warn("User cancelled directory picker.");
    }
  }

  async function handleExport() {
    if (!_dirHandle) {
      Components.showToast('请先选择本地同步文件夹', 'error');
      return;
    }

    try {
      // Verify permissions gracefully
      const perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('没有权限');

      Components.showToast('正在导出到文件夹...', 'info');
      await DB.exportToFolder(_dirHandle);
      Components.showToast('导出成功 ✓');
    } catch (e) {
      console.error(e);
      Components.showToast('导出失败，请检查控制台', 'error');
    }
  }

  async function handleImport() {
    if (!_dirHandle) {
      Components.showToast('请先选择本地同步文件夹', 'error');
      return;
    }

    if (!confirm('从文件夹导入将会用本地文件覆盖/合并当前 IndexedDB 数据，是否继续？')) return;

    try {
      const perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('没有权限');

      Components.showToast('正在导入...', 'info');
      await DB.importFromFolder(_dirHandle);
      Components.showToast('导入成功 ✓');
      Router.navigate('/');
    } catch (e) {
      console.error(e);
      Components.showToast('导入失败，未能正确读取数据结构', 'error');
    }
  }

  function handleFallbackExport() {
    DB.exportJSONFallback();
  }

  function handleFallbackImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(text => DB.importJSONFallback(text, 'merge').then(() => {
      Components.showToast('导入成功 ✓');
      e.target.value = '';
      Router.navigate('/');
    })).catch(() => Components.showToast('导入失败', 'error'));
  }

  // Debug function to clear DB
  async function handleClearDB() {
    if (confirm('是否彻底清空浏览器中的所有数据？')) {
      await DB.clearAllGames();
      Components.showToast('存储已清空');
      setTimeout(() => location.reload(), 500);
    }
  }

  function render() {
    const page = document.getElementById('page-settings');
    if (!page) return;

    const hasFSA = 'showDirectoryPicker' in window;

    page.innerHTML = `
      <div class="container--narrow form-page">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
          <button class="btn btn-ghost btn-sm" onclick="Router.navigate('/')">← 返回</button>
          <h1 style="font-size:1.3rem">存储与同步设置</h1>
        </div>

        <!-- 浏览器本地存储状态 -->
        <div class="form-section">
          <div class="form-section-title">📦 浏览器本地存储</div>
          <p style="font-size:.9rem;color:var(--text);line-height:1.6">
            你的所有更改都会自动保存在浏览器的 <strong>IndexedDB</strong> 中。即使你关闭网页，下次打开时数据依然保留。<br>
            <span style="color:var(--primary);font-weight:600">这是主要的运作方式，自动保存正常运行中。</span>
          </p>
          <button class="btn btn-ghost btn-sm" style="margin-top:12px;color:#cc6c6a" onclick="SettingsPage.handleClearDB()">⚠️ 危险：清空浏览器数据</button>
        </div>

        <!-- 本地文件夹同步 -->
        <div class="form-section">
          <div class="form-section-title">📁 本地文件夹同步 (导出 / 备份)</div>
          ${hasFSA
        ? `
            <p style="font-size:.9rem;color:var(--text);line-height:1.6;margin-bottom:16px;">
              你可以选择设备上的一个专属文件夹（建议新建一个空文件夹 <code>otome-review-data</code>），应用程序会将你的数据和图片直接写成实际文件（.json 和 .png）作为永久备份结构。
            </p>
            
            <div style="background:var(--surface-alt);padding:14px;border-radius:var(--radius-sm);margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
              <div>
                <strong style="display:block;margin-bottom:4px">当前连接的文件夹：</strong>
                <span style="color:${_dirHandle ? 'var(--primary)' : 'var(--text-muted)'}">${_dirHandle ? _dirHandle.name : '未连接 (建议主动选择)'}</span>
              </div>
              <button class="btn btn-outline btn-sm" onclick="SettingsPage.handleSelectFolder()">
                ${_dirHandle ? '更改文件夹' : '选择一个文件夹'}
              </button>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:12px;opacity:${_dirHandle ? 1 : 0.5};pointer-events:${_dirHandle ? 'auto' : 'none'}">
              <button class="btn btn-primary" onclick="SettingsPage.handleExport()">⬇ 备份导出到该文件夹</button>
              <button class="btn btn-danger" onclick="SettingsPage.handleImport()">⬆ 从该文件夹的数据导入</button>
            </div>
            `
        : `
            <p style="font-size:.9rem;color:var(--text);line-height:1.6;margin-bottom:16px;color:#cc6c6a">
              当前浏览器不支持直接文件夹读写 (File System Access API 限制)。不支持导出原生图片格式。<br>作为后备方案，支持简单的 JSON 文件直接备份。
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:12px">
              <button class="btn btn-primary" onclick="SettingsPage.handleFallbackExport()">⬇ 导出 JSON 备份</button>
              <label class="btn btn-outline" style="cursor:pointer">
                ⬆ 导入 JSON 记录
                <input type="file" accept=".json" style="display:none" onchange="SettingsPage.handleFallbackImport(event)">
              </label>
            </div>
          `}
        </div>

        <!-- 隐私说明 -->
        <div class="form-section">
          <div class="form-section-title">🔒 隐私说明</div>
          <p style="font-size:.85rem;color:var(--text-muted);line-height:1.6">
            本应用为 <strong>纯本地优先设计 (Local-First)</strong>。所有文本数据与上传的照片仅存在于你当前的浏览器缓存里，以及你主动选择授权的本地文件夹中。<br><br>
            应用不可、也不会在任何未经授权的情况下扫描或上传您的个人数据至第三方云端服务器。
          </p>
        </div>
      </div>
    `;
  }

  return { render, handleSelectFolder, handleExport, handleImport, handleFallbackExport, handleFallbackImport, handleClearDB };
})();
