/* ══════════════════════════════════════════
   DATA LAYER — data.js
   IndexedDB Persistence & File System API
══════════════════════════════════════════ */

const DB_NAME = 'OtomeJournalDB';
const DB_VERSION = 1;
const THEME_KEY = 'otome_theme';
const REVIEWER_KEY = 'otome_reviewer';

let db = null;
let _games = [];

// ── Helpers ──────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function dataURItoBlob(dataURI) {
  if (!dataURI.startsWith('data:')) return null;
  const split = dataURI.split(',');
  const byteString = atob(split[1]);
  const mimeString = split[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── DB Init ──────────────────────────────
async function init() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('games')) {
        database.createObjectStore('games', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      _loadAll().then(resolve).catch(reject);
    };
    request.onerror = () => reject(request.error);
  });
}

function _loadAll() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve([]);
    const txn = db.transaction('games', 'readonly');
    const store = txn.objectStore('games');
    const req = store.getAll();
    req.onsuccess = async () => {
      _games = req.result || [];
      
      // Auto-migrate from localStorage if IDB is empty
      if (_games.length === 0) {
        try {
          const oldData = localStorage.getItem('otome_games_v1');
          if (oldData) {
            const parsed = JSON.parse(oldData);
            if (Array.isArray(parsed) && parsed.length > 0) {
               for (const g of parsed) {
                 await saveGame(g);
               }
               resolve(_games);
               return;
            }
          }
        } catch(e) { console.warn("Migration failed", e); }
      }
      resolve(_games);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── CRUD ─────────────────────────────────
function getAllGames() {
  // In-memory array for synchronous UI renders
  return [..._games].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getGame(id) {
  return _games.find(g => g.id === id) || null;
}

async function saveGame(game) {
  const now = Date.now();
  if (!game.id) {
    game.id = genId();
    game.createdAt = now;
  }
  game.updatedAt = now;

  return new Promise((resolve, reject) => {
    const txn = db.transaction('games', 'readwrite');
    const store = txn.objectStore('games');
    store.put(game);
    txn.oncomplete = () => {
      const idx = _games.findIndex(g => g.id === game.id);
      if (idx >= 0) _games[idx] = game;
      else _games.push(game);
      resolve(game);
    };
    txn.onerror = () => reject(txn.error);
  });
}

async function deleteGame(id) {
  return new Promise((resolve, reject) => {
    const txn = db.transaction('games', 'readwrite');
    const store = txn.objectStore('games');
    store.delete(id);
    txn.oncomplete = () => {
      _games = _games.filter(g => g.id !== id);
      resolve(true);
    };
    txn.onerror = () => reject(txn.error);
  });
}

async function bulkImportGames(importedGames) {
  return new Promise((resolve, reject) => {
    const txn = db.transaction('games', 'readwrite');
    const store = txn.objectStore('games');
    importedGames.forEach(g => {
      store.put(g);
      const idx = _games.findIndex(existing => existing.id === g.id);
      if (idx >= 0) _games[idx] = g;
      else _games.push(g);
    });
    txn.oncomplete = () => resolve();
    txn.onerror = () => reject(txn.error);
  });
}

async function clearAllGames() {
  return new Promise((resolve, reject) => {
    const txn = db.transaction('games', 'readwrite');
    txn.objectStore('games').clear();
    txn.oncomplete = () => { _games = []; resolve(); };
    txn.onerror = () => reject(txn.error);
  });
}

// ── File System Access API Export ────────
async function exportToFolder(dirHandle) {
  // 1. Create Structure
  const dataDir = await dirHandle.getDirectoryHandle('data', { create: true });
  const imgDir = await dirHandle.getDirectoryHandle('images', { create: true });
  const coversDir = await imgDir.getDirectoryHandle('game-covers', { create: true });
  const gameCgsDir = await imgDir.getDirectoryHandle('game-cg', { create: true });
  const charPortraitsDir = await imgDir.getDirectoryHandle('character-portraits', { create: true });
  const charCgsDir = await imgDir.getDirectoryHandle('character-cg', { create: true });

  // Deep clone to strip payloads safely
  const exportGames = JSON.parse(JSON.stringify(_games));

  async function writeImage(base64Data, namePrefix, dir, mimeTypeExt) {
    if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
    const blob = dataURItoBlob(base64Data);
    if (!blob) return base64Data;
    const ext = blob.type.split('/')[1] || mimeTypeExt;
    const filename = `${namePrefix}.${ext}`;
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return filename; // Return relative filename for linking
  }

  // 2. Iterate and write images, mutate export objects
  for (let g of exportGames) {
    if (g.cover && g.cover.startsWith('data:')) {
      g.coverPath = await writeImage(g.cover, `${g.id}_cover`, coversDir, 'png');
      delete g.cover; // Remove heavy string
    }
    
    if (g.cgs) {
      for (let i = 0; i < g.cgs.length; i++) {
        const cg = g.cgs[i];
        if (cg.src && cg.src.startsWith('data:')) {
           cg.srcPath = await writeImage(cg.src, `${g.id}_cg_${cg.id}`, gameCgsDir, 'png');
           delete cg.src;
        }
      }
    }

    if (g.characters) {
      for (let c of g.characters) {
        if (c.portrait && c.portrait.startsWith('data:')) {
          c.portraitPath = await writeImage(c.portrait, `${g.id}_char_${c.id}_portrait`, charPortraitsDir, 'png');
          delete c.portrait;
        }
        if (c.cgs) {
          for (let i = 0; i < c.cgs.length; i++) {
            const ccg = c.cgs[i];
            if (ccg.src && ccg.src.startsWith('data:')) {
               ccg.srcPath = await writeImage(ccg.src, `${g.id}_char_${c.id}_cg_${ccg.id}`, charCgsDir, 'png');
               delete ccg.src;
            }
          }
        }
      }
    }

    if (g.impressions) {
      for (let imp of g.impressions) {
        if (imp.portrait && imp.portrait.startsWith('data:')) {
          imp.portraitPath = await writeImage(imp.portrait, `${g.id}_imp_${imp.id}_portrait`, charPortraitsDir, 'png');
          delete imp.portrait;
        }
      }
    }
  }

  // 3. Write structured JSON
  const gamesFileHandle = await dataDir.getFileHandle('games.json', { create: true });
  const gWritable = await gamesFileHandle.createWritable();
  await gWritable.write(JSON.stringify({ version: 2, games: exportGames }, null, 2));
  await gWritable.close();

  const settingsFileHandle = await dataDir.getFileHandle('settings.json', { create: true });
  const sWritable = await settingsFileHandle.createWritable();
  await sWritable.write(JSON.stringify({ theme: getTheme(), reviewer: getReviewer() }, null, 2));
  await sWritable.close();
}

async function importFromFolder(dirHandle) {
  try {
    const dataDir = await dirHandle.getDirectoryHandle('data');
    const gamesFileHandle = await dataDir.getFileHandle('games.json');
    const file = await gamesFileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    const importedGames = data.games || [];

    const imgDir = await dirHandle.getDirectoryHandle('images').catch(() => null);

    async function loadImgDataURL(subDirName, filename) {
      if (!imgDir || !filename) return '';
      try {
        const subDir = await imgDir.getDirectoryHandle(subDirName);
        const fHandle = await subDir.getFileHandle(filename);
        const imgFile = await fHandle.getFile();
        return await blobToDataURL(imgFile);
      } catch(e) { return ''; }
    }

    // Reconstruct base64 payloads
    for (let g of importedGames) {
      if (g.coverPath) {
        g.cover = await loadImgDataURL('game-covers', g.coverPath);
        delete g.coverPath;
      }
      if (g.cgs) {
        for (let cg of g.cgs) {
          if (cg.srcPath) {
            cg.src = await loadImgDataURL('game-cg', cg.srcPath);
            delete cg.srcPath;
          }
        }
      }
      if (g.characters) {
        for (let c of g.characters) {
          if (c.portraitPath) {
            c.portrait = await loadImgDataURL('character-portraits', c.portraitPath);
            delete c.portraitPath;
          }
          if (c.cgs) {
             for (let ccg of c.cgs) {
               if (ccg.srcPath) {
                  ccg.src = await loadImgDataURL('character-cg', ccg.srcPath);
                  delete ccg.srcPath;
               }
             }
          }
        }
      }
      if (g.impressions) {
        for (let imp of g.impressions) {
          if (imp.portraitPath) {
            imp.portrait = await loadImgDataURL('character-portraits', imp.portraitPath);
            delete imp.portraitPath;
          }
        }
      }
    }

    // Write all to IDB
    await bulkImportGames(importedGames);
    return true;
  } catch(e) {
    console.error("Folder import failed", e);
    throw e;
  }
}

// ── Schema factory ───────────────────────
function newGame(overrides = {}) {
  return {
    id: '',
    title: '',
    company: '',
    writer: '',
    illustrator: '',
    releaseDate: '',
    progress: '未开始',
    cover: '',
    ratings: { overall: 0, story: 0, characters: 0, art: 0, voice: 0, emotion: 0 },
    customRatings: [],
    review: '',
    cgs: [],
    characters: [],
    impressions: [],
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  };
}

function newCharacter(overrides = {}) {
  return {
    id: genId(),
    name: '',
    portrait: '',
    tags: [],
    rating: 0,
    shortComment: '',
    fullReview: '',
    cgs: [],
    ...overrides
  };
}

function newImpression(overrides = {}) {
  return {
    id: genId(),
    name: '',
    portrait: '',
    before: '',
    after: '',
    ...overrides
  };
}

function newCGImage(src, caption = '') {
  return { id: genId(), src, caption };
}

// ── Derived helpers ───────────────────────
function getAllTags() {
  const set = new Set();
  getAllGames().forEach(g => {
    (g.tags || []).forEach(t => set.add(t));
    (g.characters || []).forEach(c => (c.tags || []).forEach(t => set.add(t)));
  });
  return [...set].sort();
}

// ── Fallback Export / Import ───────────────────────
// (For browsers without File System API or for simple JSON blob)
function exportJSONFallback() {
  const blob = new Blob([JSON.stringify({ version: 2, games: _games }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  a.href = url; a.download = `otome_backup_fallback_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importJSONFallback(text, mode = 'merge') {
  const data = JSON.parse(text);
  const incoming = (data.games || data);
  if (!Array.isArray(incoming)) throw new Error('格式不正确');
  if (mode === 'replace') {
    await clearAllGames();
  }
  await bulkImportGames(incoming);
}

// ── Theme & Reviewer ───────────────────────
function getTheme()        { return localStorage.getItem(THEME_KEY) || 'pink'; }
function setTheme(theme)   { localStorage.setItem(THEME_KEY, theme); }

function getReviewer()     { return localStorage.getItem(REVIEWER_KEY) || ''; }
function setReviewer(name) { localStorage.setItem(REVIEWER_KEY, name); }

// ── Exports ───────────────────────────────
window.DB = {
  init,
  getAllGames, getGame, saveGame, deleteGame, clearAllGames, bulkImportGames,
  newGame, newCharacter, newCGImage, newImpression,
  getAllTags,
  exportToFolder, importFromFolder,
  exportJSONFallback, importJSONFallback,
  getTheme, setTheme,
  getReviewer, setReviewer,
  genId,
};
