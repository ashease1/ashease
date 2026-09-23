// ============================================
// SILENT STUDIOS — Content Management (CMS)
// Stores content + large media (IndexedDB)
// ============================================

const CMS = {
  STORAGE_KEY: 'silent_studios_content',
  AUTH_KEY: 'silent_studios_admin_auth',
  ADMIN_PASS: (typeof window !== 'undefined' && window.__SS_ADMIN_CONFIG?.password) || 'Jot_robot@123',
  DB_NAME: 'SilentStudiosMedia',
  DB_VERSION: 1,
  CONTENT_VERSION: 2,
  LOGIN_ATTEMPTS_KEY: 'silent_studios_admin_attempts',

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
    console.log('Login attempt - ADMIN_PASS:', this.ADMIN_PASS, 'Input:', password);
    if (!this.ADMIN_PASS) return false;
    // Temporarily disable lockout for testing
    // const attempts = this._loginAttempts();
    // if (attempts.count >= 5 && Date.now() - attempts.lastAt < 15 * 60 * 1000) {
    //   return false;
    // }
    if (password === this.ADMIN_PASS) {
      sessionStorage.setItem(this.AUTH_KEY, 'true');
      sessionStorage.removeItem(this.LOGIN_ATTEMPTS_KEY);
      return true;
    }
    // Temporarily disable attempt tracking for testing
    // attempts.count += 1;
    // attempts.lastAt = Date.now();
    // sessionStorage.setItem(this.LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
    return false;
  },

  _loginAttempts() {
    try {
      const raw = sessionStorage.getItem(this.LOGIN_ATTEMPTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { count: 0, lastAt: 0 };
  },

  isLoginLocked() {
    if (!this.ADMIN_PASS) return true;
    const attempts = this._loginAttempts();
    return attempts.count >= 5 && Date.now() - attempts.lastAt < 15 * 60 * 1000;
  },

  adminConfigured() {
    return Boolean(this.ADMIN_PASS);
  },

  /** Fix common UTF-8-as-Latin1 mojibake in CMS strings */
  fixTextEncoding(str) {
    if (typeof str !== 'string' || !str) return str;
    return str
      .replace(/\u2019/g, "'")
      .replace(/\u2018/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\u2192/g, '->')
      .replace(/â€™/g, "'")
      .replace(/â€˜/g, "'")
      .replace(/â€œ|â€\u009d/g, '"')
      .replace(/â€"|â€"/g, '-')
      .replace(/â†'/g, '->')
      .replace(/â‚¹/g, 'Rs.');
  },

  _sanitizeContent(obj) {
    if (typeof obj === 'string') return this.fixTextEncoding(obj);
    if (Array.isArray(obj)) return obj.map(item => this._sanitizeContent(item));
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = this._sanitizeContent(v);
      return out;
    }
    return obj;
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

  normalizeMediaPath(ref) {
    if (!ref || ref.startsWith('idb:') || /^https?:\/\//i.test(ref)) return ref;
    if (ref.startsWith('assets/')) return ref;
    if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(ref)) {
      const name = ref.split('/').pop();
      return `assets/audio/${name}`;
    }
    return ref;
  },

  _normalizeContentPaths(content) {
    const c = content;
    (c.tracks || []).forEach(t => {
      if (t.audio) t.audio = this.normalizeMediaPath(t.audio);
    });
    (c.projects || []).forEach(p => {
      if (p.audio) p.audio = this.normalizeMediaPath(p.audio);
    });
    return c;
  },

  async getMediaUrl(ref) {
    if (!ref) return '';
    if (!ref.startsWith('idb:')) return this.normalizeMediaPath(ref);
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
        { id: 't1', title: 'Never Giving Up', genre: 'Original Track', audio: 'assets/audio/never-giving-up.mp3' },
        { id: 't2', title: 'Reach', genre: 'Original Track', audio: 'assets/audio/reach.mp3' },
        { id: 't3', title: 'Heal With Music', genre: 'Original Track', audio: 'assets/audio/heal-with-music.mp3' }
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
        this._content = this._sanitizeContent(JSON.parse(stored));
        this._ensureArrays();
        this._normalizeContentPaths(this._content);
        if (defaults) this._mergeDefaults(defaults);
        this._applyContentVersion(defaults);
        this._normalizeContentPaths(this._content);
        return this._content;
      } catch (_) { /* continue */ }
    }

    if (defaults) {
      this._content = this._sanitizeContent(defaults);
      this._ensureArrays();
      this._normalizeContentPaths(this._content);
      this._content.contentVersion = this.CONTENT_VERSION;
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._content)); } catch (_) {}
      return this._content;
    }

    this._content = this.defaultContent();
    if (defaults) this._mergeDefaults(defaults);
    this._ensureArrays();
    return this._content;
  },

  _applyContentVersion(defaults) {
    const v = this._content.contentVersion || 0;
    if (v >= this.CONTENT_VERSION || !defaults) return;
    if (defaults.studios?.length) this._content.studios = defaults.studios;
    this._content.contentVersion = this.CONTENT_VERSION;
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._content)); } catch (_) {}
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

    alert(`File is large (${(file.size / 1024 / 1024).toFixed(1)} MB).\n\n1. Save the downloaded file to: ${suggestedPath}\n2. The path "${suggestedPath}" has been set automatically.\n3. When you deploy to Vercel, include this file in your folder and redeploy.`);
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
