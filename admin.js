// ============================================
// SILENT STUDIOS — ADMIN PANEL
// ============================================

const ADMIN_PASS = 'silent2025'; // Change this password!
const STORAGE_KEY = 'silent_studios_content';
const BOOKINGS_KEY = 'silent_studios_bookings';
const AUTH_KEY = 'silent_studios_admin_auth';
const THEME_KEY = 'silent_studios_theme';

let content = null;
let currentSection = 'projects';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  if (sessionStorage.getItem(AUTH_KEY) === 'true') showDashboard();
  else showLogin();

  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const pass = document.getElementById('adminPass').value;
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      showDashboard();
    } else {
      alert('Incorrect password.');
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  document.getElementById('addNewBtn')?.addEventListener('click', () => openAddForm());

  initForms();
  initUploadZones();
});

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function showLogin() {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('dashboard').hidden = true;
}

async function showDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  await loadContent();
  switchSection('projects');
}

async function loadContent() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    content = JSON.parse(stored);
    return;
  }
  try {
    const res = await fetch('data/default-content.json');
    content = await res.json();
    saveContent();
  } catch (_) {
    content = { projects: [], gallery: [], videos: [], studios: [], packages: [] };
  }
}

function saveContent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}

function switchSection(section) {
  currentSection = section;
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === section));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${section}`)?.classList.add('active');

  const titles = { projects: 'Projects', gallery: 'Gallery Images', videos: 'Videos', studios: 'Studio Rooms', packages: 'Packages', bookings: 'Booking Requests' };
  document.getElementById('sectionTitle').textContent = titles[section] || section;

  const addBtn = document.getElementById('addNewBtn');
  addBtn.style.display = ['studios', 'packages', 'bookings'].includes(section) ? 'none' : 'inline-flex';

  hideAllForms();
  renderSection(section);
}

function hideAllForms() {
  ['projectForm', 'galleryForm', 'videoForm'].forEach(id => {
    document.getElementById(id).hidden = true;
  });
}

function openAddForm() {
  hideAllForms();
  if (currentSection === 'projects') {
    document.getElementById('projectForm').hidden = false;
    document.getElementById('projectFormTitle').textContent = 'Add Project';
    document.getElementById('projectFormEl').reset();
    document.getElementById('projId').value = '';
    document.getElementById('projImagePreview').innerHTML = '';
  } else if (currentSection === 'gallery') {
    document.getElementById('galleryForm').hidden = false;
    document.getElementById('galleryFormEl').reset();
    document.getElementById('galImagePreview').innerHTML = '';
  } else if (currentSection === 'videos') {
    document.getElementById('videoForm').hidden = false;
    document.getElementById('videoFormTitle').textContent = 'Add Video';
    document.getElementById('videoFormEl').reset();
    document.getElementById('vidId').value = '';
  }
}

function renderSection(section) {
  switch (section) {
    case 'projects': renderProjectsList(); break;
    case 'gallery': renderGalleryList(); break;
    case 'videos': renderVideosList(); break;
    case 'studios': renderStudiosList(); break;
    case 'packages': renderPackagesList(); break;
    case 'bookings': renderBookingsList(); break;
  }
}

function renderProjectsList() {
  const list = document.getElementById('projectsList');
  if (!content.projects.length) {
    list.innerHTML = '<div class="admin-empty">No projects yet. Click "+ Add New" to create one.</div>';
    return;
  }
  list.innerHTML = content.projects.map(p => `
    <div class="admin-item">
      <div class="admin-item-thumb">${p.image ? `<img src="${p.image}" alt="">` : '🎵'}</div>
      <div class="admin-item-info"><h4>${p.title}</h4><p>${p.client} · ${p.year} · ${p.category}</p></div>
      <div class="admin-item-actions">
        <button class="admin-btn-sm" onclick="editProject('${p.id}')">Edit</button>
        <button class="admin-btn-sm danger" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderGalleryList() {
  const list = document.getElementById('galleryList');
  if (!content.gallery.length) {
    list.innerHTML = '<div class="admin-empty">No gallery images. Click "+ Add New" to upload.</div>';
    return;
  }
  list.innerHTML = content.gallery.map((g, i) => `
    <div class="admin-item">
      <img class="admin-item-thumb" src="${g.src}" alt="">
      <div class="admin-item-info"><h4>${g.caption || 'Untitled'}</h4></div>
      <div class="admin-item-actions">
        <button class="admin-btn-sm danger" onclick="deleteGallery(${i})">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderVideosList() {
  const list = document.getElementById('videosList');
  if (!content.videos.length) {
    list.innerHTML = '<div class="admin-empty">No videos yet. Click "+ Add New" to upload.</div>';
    return;
  }
  list.innerHTML = content.videos.map(v => `
    <div class="admin-item">
      <div class="admin-item-thumb">🎬</div>
      <div class="admin-item-info"><h4>${v.title}</h4><p>${v.description || v.category}</p></div>
      <div class="admin-item-actions">
        <button class="admin-btn-sm" onclick="editVideo('${v.id}')">Edit</button>
        <button class="admin-btn-sm danger" onclick="deleteVideo('${v.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderStudiosList() {
  const list = document.getElementById('studiosList');
  list.innerHTML = content.studios.map(s => `
    <div class="admin-item">
      <div class="admin-item-thumb">${s.image ? `<img src="${s.image}" alt="">` : '🎙️'}</div>
      <div class="admin-item-info"><h4>${s.name}</h4><p>${s.capacity} · ₹${s.hourlyRate}/hr</p></div>
    </div>
  `).join('');
}

function renderPackagesList() {
  const list = document.getElementById('packagesList');
  list.innerHTML = content.packages.map(p => `
    <div class="admin-item">
      <div class="admin-item-thumb">💎</div>
      <div class="admin-item-info"><h4>${p.name}</h4><p>${p.price} · ${p.duration}</p></div>
    </div>
  `).join('');
}

function renderBookingsList() {
  const list = document.getElementById('bookingsList');
  const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
  if (!bookings.length) {
    list.innerHTML = '<div class="admin-empty">No booking requests yet. They appear here when clients use the Advanced Booking wizard.</div>';
    return;
  }
  list.innerHTML = bookings.reverse().map(b => `
    <div class="admin-item">
      <div class="admin-item-thumb">📅</div>
      <div class="admin-item-info">
        <h4>${b.name} — ${b.service}</h4>
        <div class="booking-detail">
          ${b.date || ''} ${b.time || ''} · ${b.phone}<br>
          ${b.email} · ${b.projectName || 'No project name'}<br>
          <em>${new Date(b.createdAt).toLocaleString()}</em>
        </div>
      </div>
      <div class="admin-item-actions">
        <a class="admin-btn-sm" href="https://wa.me/91${b.phone?.replace(/\D/g,'')}" target="_blank">WhatsApp</a>
        <button class="admin-btn-sm danger" onclick="deleteBooking(${b.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

// ── CRUD OPERATIONS ──────────────────────────
window.editProject = function(id) {
  const p = content.projects.find(x => x.id === id);
  if (!p) return;
  hideAllForms();
  document.getElementById('projectForm').hidden = false;
  document.getElementById('projectFormTitle').textContent = 'Edit Project';
  document.getElementById('projId').value = p.id;
  document.getElementById('projTitle').value = p.title;
  document.getElementById('projClient').value = p.client;
  document.getElementById('projCategory').value = p.category;
  document.getElementById('projYear').value = p.year;
  document.getElementById('projDesc').value = p.description;
  document.getElementById('projImage').value = p.image || '';
  document.getElementById('projAudio').value = p.audio || '';
  document.getElementById('projVideo').value = p.video || '';
  if (p.image) document.getElementById('projImagePreview').innerHTML = `<img src="${p.image}" alt="">`;
};

window.deleteProject = function(id) {
  if (!confirm('Delete this project?')) return;
  content.projects = content.projects.filter(p => p.id !== id);
  saveContent();
  renderProjectsList();
};

window.deleteGallery = function(index) {
  if (!confirm('Delete this image?')) return;
  content.gallery.splice(index, 1);
  saveContent();
  renderGalleryList();
};

window.editVideo = function(id) {
  const v = content.videos.find(x => x.id === id);
  if (!v) return;
  hideAllForms();
  document.getElementById('videoForm').hidden = false;
  document.getElementById('videoFormTitle').textContent = 'Edit Video';
  document.getElementById('vidId').value = v.id;
  document.getElementById('vidTitle').value = v.title;
  document.getElementById('vidDesc').value = v.description || '';
  document.getElementById('vidCategory').value = v.category || 'behind-the-scenes';
  document.getElementById('vidSrc').value = v.src || '';
};

window.deleteVideo = function(id) {
  if (!confirm('Delete this video?')) return;
  content.videos = content.videos.filter(v => v.id !== id);
  saveContent();
  renderVideosList();
};

window.deleteBooking = function(id) {
  if (!confirm('Delete this booking request?')) return;
  let bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
  bookings = bookings.filter(b => b.id !== id);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  renderBookingsList();
};

// ── FORMS ────────────────────────────────────
function initForms() {
  document.getElementById('cancelProject')?.addEventListener('click', () => {
    document.getElementById('projectForm').hidden = true;
  });

  document.getElementById('projectFormEl')?.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('projId').value || 'p' + Date.now();
    const project = {
      id,
      title: document.getElementById('projTitle').value,
      client: document.getElementById('projClient').value,
      category: document.getElementById('projCategory').value,
      year: document.getElementById('projYear').value,
      description: document.getElementById('projDesc').value,
      image: document.getElementById('projImage').value,
      audio: document.getElementById('projAudio').value,
      video: document.getElementById('projVideo').value
    };
    const idx = content.projects.findIndex(p => p.id === id);
    if (idx >= 0) content.projects[idx] = project;
    else content.projects.push(project);
    saveContent();
    document.getElementById('projectForm').hidden = true;
    renderProjectsList();
  });

  document.getElementById('cancelGallery')?.addEventListener('click', () => {
    document.getElementById('galleryForm').hidden = true;
  });

  document.getElementById('galleryFormEl')?.addEventListener('submit', e => {
    e.preventDefault();
    const src = document.getElementById('galImage').value;
    if (!src) { alert('Please upload an image.'); return; }
    content.gallery.push({ src, caption: document.getElementById('galCaption').value });
    saveContent();
    document.getElementById('galleryForm').hidden = true;
    renderGalleryList();
  });

  document.getElementById('cancelVideo')?.addEventListener('click', () => {
    document.getElementById('videoForm').hidden = true;
  });

  document.getElementById('videoFormEl')?.addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('vidId').value || 'v' + Date.now();
    const video = {
      id,
      title: document.getElementById('vidTitle').value,
      description: document.getElementById('vidDesc').value,
      category: document.getElementById('vidCategory').value,
      src: document.getElementById('vidSrc').value
    };
    const idx = content.videos.findIndex(v => v.id === id);
    if (idx >= 0) content.videos[idx] = video;
    else content.videos.push(video);
    saveContent();
    document.getElementById('videoForm').hidden = true;
    renderVideosList();
  });
}

// ── FILE UPLOAD (Base64 → localStorage) ──────
function initUploadZones() {
  document.querySelectorAll('.admin-upload').forEach(zone => {
    const input = zone.querySelector('input[type="file"]');
    const targetId = zone.dataset.target;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0], targetId);
    });
    input.addEventListener('change', () => {
      if (input.files[0]) processFile(input.files[0], targetId);
    });
  });
}

function processFile(file, targetId) {
  if (file.size > 4 * 1024 * 1024) {
    alert('File too large for browser storage (max 4MB). For larger files, upload to assets/ folder and enter the path manually.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(targetId).value = e.target.result;
    const preview = document.getElementById(targetId + 'Preview');
    if (preview && file.type.startsWith('image/')) {
      preview.innerHTML = `<img src="${e.target.result}" alt="">`;
    }
  };
  reader.readAsDataURL(file);
}
