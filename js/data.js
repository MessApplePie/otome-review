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
function getSafeName(str) {
  if (!str) return 'unknown';
  return str.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'unnamed';
}

async function exportToFolder(dirHandle) {
  // Save settings at root
  const settingsFileHandle = await dirHandle.getFileHandle('settings.json', { create: true });
  const sWritable = await settingsFileHandle.createWritable();
  await sWritable.write(JSON.stringify({ theme: getTheme(), reviewer: getReviewer() }, null, 2));
  await sWritable.close();

  const gamesDir = await dirHandle.getDirectoryHandle('games', { create: true });
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
    return filename; // Return relative filename
  }

  for (let g of exportGames) {
    const gameFolderName = `${getSafeName(g.title)}_${g.id}`;
    const gameDir = await gamesDir.getDirectoryHandle(gameFolderName, { create: true });

    // Covers
    if (g.cover && g.cover.startsWith('data:')) {
      const coversDir = await gameDir.getDirectoryHandle('covers', { create: true });
      g.coverPath = 'covers/' + await writeImage(g.cover, 'cover', coversDir, 'png');
      delete g.cover;
    }
    
    // Game CGs
    if (g.cgs && g.cgs.length > 0) {
      const cgDir = await gameDir.getDirectoryHandle('gameCG', { create: true });
      for (let i = 0; i < g.cgs.length; i++) {
        const cg = g.cgs[i];
        if (cg.src && cg.src.startsWith('data:')) {
           cg.srcPath = 'gameCG/' + await writeImage(cg.src, cg.id, cgDir, 'png');
           delete cg.src;
        }
      }
    }

    // Impressions 
    if (g.impressions && g.impressions.length > 0) {
      let impPortraitDir = null;
      for (let imp of g.impressions) {
        if (imp.portrait && imp.portrait.startsWith('data:')) {
          if (!impPortraitDir) impPortraitDir = await gameDir.getDirectoryHandle('impressions', { create: true });
          imp.portraitPath = 'impressions/' + await writeImage(imp.portrait, `imp_${imp.id}`, impPortraitDir, 'png');
          delete imp.portrait;
        }
      }
    }

    // Characters extraction
    const charArray = g.characters || [];
    delete g.characters;

    if (charArray.length > 0) {
      const charsDir = await gameDir.getDirectoryHandle('characters', { create: true });
      for (let c of charArray) {
        const charFolderName = `${getSafeName(c.name)}_${c.id}`;
        const charDir = await charsDir.getDirectoryHandle(charFolderName, { create: true });

        // Portrait
        if (c.portrait && c.portrait.startsWith('data:')) {
          const portraitDir = await charDir.getDirectoryHandle('portrait', { create: true });
          c.portraitPath = 'portrait/' + await writeImage(c.portrait, 'portrait', portraitDir, 'png');
          delete c.portrait;
        }
        
        // Character CGs
        if (c.cgs && c.cgs.length > 0) {
          const charCgDir = await charDir.getDirectoryHandle('cg', { create: true });
          for (let i = 0; i < c.cgs.length; i++) {
            const ccg = c.cgs[i];
            if (ccg.src && ccg.src.startsWith('data:')) {
               ccg.srcPath = 'cg/' + await writeImage(ccg.src, ccg.id, charCgDir, 'png');
               delete ccg.src;
            }
          }
        }

        const charFileHandle = await charDir.getFileHandle('character.json', { create: true });
        const cWritable = await charFileHandle.createWritable();
        await cWritable.write(JSON.stringify(c, null, 2));
        await cWritable.close();
      }
    }

    // Game JSON
    const gameFileHandle = await gameDir.getFileHandle('game.json', { create: true });
    const gWritable = await gameFileHandle.createWritable();
    await gWritable.write(JSON.stringify(g, null, 2));
    await gWritable.close();
  }
}

async function importFromFolder(dirHandle) {
  try {
    const importedGames = [];

    // Attempt settings
    try {
      const sFileHandle = await dirHandle.getFileHandle('settings.json');
      const sFile = await sFileHandle.getFile();
      const sData = JSON.parse(await sFile.text());
      if (sData.theme) setTheme(sData.theme);
      if (sData.reviewer) setReviewer(sData.reviewer);
    } catch(e) {}

    const gamesDir = await dirHandle.getDirectoryHandle('games').catch(() => null);
    if (!gamesDir) return true;

    async function loadImgDataURL(subDirPath, parentDir) {
       if (!subDirPath) return '';
       try {
         const parts = subDirPath.split('/');
         const filename = parts.pop();
         let currentDir = parentDir;
         for (const p of parts) {
           currentDir = await currentDir.getDirectoryHandle(p);
         }
         const fHandle = await currentDir.getFileHandle(filename);
         const imgFile = await fHandle.getFile();
         return await blobToDataURL(imgFile);
       } catch(e) { return ''; }
    }

    for await (const [gameFolderName, gameDirHandle] of gamesDir.entries()) {
      if (gameDirHandle.kind !== 'directory') continue;
      
      try {
        const gameFileHandle = await gameDirHandle.getFileHandle('game.json');
        const gameFile = await gameFileHandle.getFile();
        const g = JSON.parse(await gameFile.text());

        if (g.coverPath) {
          g.cover = await loadImgDataURL(g.coverPath, gameDirHandle);
          delete g.coverPath;
        }
        if (g.cgs) {
          for (let cg of g.cgs) {
            if (cg.srcPath) {
              cg.src = await loadImgDataURL(cg.srcPath, gameDirHandle);
              delete cg.srcPath;
            }
          }
        }
        if (g.impressions) {
          for (let imp of g.impressions) {
            if (imp.portraitPath) {
              imp.portrait = await loadImgDataURL(imp.portraitPath, gameDirHandle);
              delete imp.portraitPath;
            }
          }
        }

        g.characters = [];
        const charsDir = await gameDirHandle.getDirectoryHandle('characters').catch(()=>null);
        if (charsDir) {
          for await (const [charFolderName, charDirHandle] of charsDir.entries()) {
            if (charDirHandle.kind !== 'directory') continue;
            try {
              const charFileHandle = await charDirHandle.getFileHandle('character.json');
              const charFile = await charFileHandle.getFile();
              const c = JSON.parse(await charFile.text());

              if (c.portraitPath) {
                c.portrait = await loadImgDataURL(c.portraitPath, charDirHandle);
                delete c.portraitPath;
              }
              if (c.cgs) {
                 for (let ccg of c.cgs) {
                   if (ccg.srcPath) {
                      ccg.src = await loadImgDataURL(ccg.srcPath, charDirHandle);
                      delete ccg.srcPath;
                   }
                 }
              }
              g.characters.push(c);
            } catch(e) { console.error('Char import failed', e); }
          }
        }

        importedGames.push(g);
      } catch(e) { console.error('Game import failed', e); }
    }

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
