// ============================================
// SILENT STUDIOS — Content Management (CMS)
// Stores content + large media (IndexedDB)
// ============================================

const CMS = {
  STORAGE_KEY: 'silent_studios_content',
  AUTH_KEY: 'silent_studios_admin_auth',
  ADMIN_PASS: 'K9#mPx7vQ2nL4wR8j',
  DB_NAME: 'SilentStudiosMedia',
  DB_VERSION: 1,

  _db: null,
  _content: null,
  _listeners: [],

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach(fn => fn(this._content));
  },

  isAdmin() {
    return sessionStorage.getItem(this.AUTH_KEY) === 'true';
  },

  login(password) {
    if (password === this.ADMIN_PASS) {
      sessionStorage.setItem(this.AUTH_KEY, 'true');
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.AUTH_KEY);
  },

  async initDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  async storeMedia(file) {
    await this.initDB();
    const id = 'm' + Date.now() + Math.random().toString(36).slice(2, 7);
    const record = { id, name: file.name, type: file.type, blob: file, size: file.size, created: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('media', 'readwrite');
      tx.objectStore('media').put(record);
      tx.oncomplete = () => resolve('idb:' + id);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getMediaUrl(ref) {
    if (!ref) return '';
    if (!ref.startsWith('idb:')) return ref;
    const id = ref.slice(4);
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('media', 'readonly');
      const req = tx.objectStore('media').get(id);
      req.onsuccess = () => {
        if (req.result?.blob) resolve(URL.createObjectURL(req.result.blob));
        else resolve('');
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deleteMedia(ref) {
    if (!ref?.startsWith('idb:')) return;
    await this.initDB();
    const id = ref.slice(4);
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('media', 'readwrite');
      tx.objectStore('media').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },

  defaultContent() {
    return {
      tracks: [
        { id: 't1', title: 'Never Giving Up', genre: 'Original Track', audio: 'never-giving-up.mp3' },
        { id: 't2', title: 'Reach', genre: 'Original Track', audio: 'reach.mp3' },
        { id: 't3', title: 'Heal With Music', genre: 'Original Track', audio: 'heal-with-music.mp3' }
      ],
      projects: [],
      gallery: [],
      videos: [],
      studios: [],
      packages: []
    };
  },

  async load() {
    let defaults = null;
    try {
      const res = await fetch('data/default-content.json');
      if (res.ok) defaults = await res.json();
    } catch (_) { /* file:// or offline */ }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this._content = JSON.parse(stored);
        this._ensureArrays();
        if (defaults) this._mergeDefaults(defaults);
        return this._content;
      } catch (_) { /* continue */ }
    }

    if (defaults) {
      this._content = defaults;
      this._ensureArrays();
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._content)); } catch (_) {}
      return this._content;
    }

    this._content = this.defaultContent();
    if (defaults) this._mergeDefaults(defaults);
    this._ensureArrays();
    return this._content;
  },

  _mergeDefaults(defaults) {
    ['tracks', 'studios', 'packages', 'projects', 'videos'].forEach(key => {
      if (!this._content[key]?.length && defaults[key]?.length) {
        this._content[key] = defaults[key];
      }
    });
  },

  _ensureArrays() {
    const c = this._content;
    ['tracks', 'projects', 'gallery', 'videos', 'studios', 'packages'].forEach(k => {
      if (!Array.isArray(c[k])) c[k] = [];
    });
  },

  get() {
    return this._content || this.defaultContent();
  },

  async save(content) {
    this._content = content;
    this._ensureArrays();
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(content));
    } catch (e) {
      alert('Storage full! Export your content and clear old media, or use file paths (assets/audio/...) for large files.');
      throw e;
    }
    this._notify();
  },

  async uploadFile(file, options = {}) {
    const maxIDB = options.maxSize || 50 * 1024 * 1024;
    const folder = options.folder || 'assets';

    if (file.size <= maxIDB) {
      try {
        return await this.storeMedia(file);
      } catch (_) { /* fall through to path */ }
    }

    const ext = file.name.split('.').pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const suggestedPath = `${folder}/${safeName}`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = safeName;
    a.click();
    URL.revokeObjectURL(a.href);

    alert(`File is large (${(file.size / 1024 / 1024).toFixed(1)} MB).\n\n1. Save the downloaded file to: ${suggestedPath}\n2. The path "${suggestedPath}" has been set automatically.\n3. When you deploy to Netlify, include this file in your folder.`);
    return suggestedPath;
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.get(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site-content.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const data = JSON.parse(e.target.result);
          await this.save(data);
          resolve(data);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};

window.CMS = CMS;
