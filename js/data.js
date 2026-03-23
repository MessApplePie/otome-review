/* ══════════════════════════════════════════
   DATA LAYER — data.js
   Pure data operations, zero DOM
══════════════════════════════════════════ */

const STORAGE_KEY = 'otome_games_v1';
const THEME_KEY   = 'otome_theme';

// ── Helpers ──────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Read / Write ─────────────────────────
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeAll(games) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    return true;
  } catch(e) {
    console.error('Storage write failed:', e);
    return false;
  }
}

// ── CRUD ─────────────────────────────────
function getAllGames() {
  return readAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getGame(id) {
  return readAll().find(g => g.id === id) || null;
}

function saveGame(game) {
  const games = readAll();
  const now = Date.now();
  if (!game.id) {
    game.id = genId();
    game.createdAt = now;
  }
  game.updatedAt = now;

  const idx = games.findIndex(g => g.id === game.id);
  if (idx >= 0) games[idx] = game;
  else games.push(game);

  return writeAll(games) ? game : null;
}

function deleteGame(id) {
  const games = readAll().filter(g => g.id !== id);
  return writeAll(games);
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

// ── Export / Import ───────────────────────
function exportJSON() {
  const games = readAll();
  const blob = new Blob([JSON.stringify({ version: 1, games }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  a.href = url; a.download = `otome_backup_${stamp}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importJSON(text, mode = 'merge') {
  const data = JSON.parse(text);
  const incoming = (data.games || data); // support bare array
  if (!Array.isArray(incoming)) throw new Error('格式不正确');

  if (mode === 'replace') {
    writeAll(incoming);
  } else {
    // merge: incoming overwrites by id
    const existing = readAll();
    const map = {};
    existing.forEach(g => map[g.id] = g);
    incoming.forEach(g => map[g.id] = g);
    writeAll(Object.values(map));
  }
}

// ── Theme ─────────────────────────────────
function getTheme()        { return localStorage.getItem(THEME_KEY) || 'pink'; }
function setTheme(theme)   { localStorage.setItem(THEME_KEY, theme); }

// ── Exports ───────────────────────────────
window.DB = {
  getAllGames, getGame, saveGame, deleteGame,
  newGame, newCharacter, newCGImage,
  getAllTags,
  exportJSON, importJSON,
  getTheme, setTheme,
  genId,
};
