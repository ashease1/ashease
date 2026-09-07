// ============================================
// SILENT STUDIOS — MAIN JAVASCRIPT
// ============================================

const BOOKINGS_KEY = 'silent_studios_bookings';
const THEME_KEY = 'silent_studios_theme';

const CATEGORY_LABELS = {
  'music-production': 'Music Production',
  'media-scoring': 'Media Scoring',
  'post-production': 'Post-Production',
  'vocal-voiceover': 'Vocal & Voiceover',
  'behind-the-scenes': 'Behind the Scenes',
  tutorial: 'Tutorial'
};

let siteContent = null;
let audioPlayerCleanup = null;
let bookingState = {
  service: 'music-production',
  studio: null,
  package: null,
  date: null,
  time: null,
  duration: '4',
  files: []
};

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initNavbar();
  initParticles();
  initReveal();
  initStats();
  initContactForm();
  initSmoothScroll();
  initActiveNav();
  initBookingTabs();
  initBookingWizard();
  initLightbox();
  initProjectModal();

  await CMS.load();
  await refreshSite();

  window.addEventListener('site-content-updated', () => refreshSite());
});

async function refreshSite() {
  siteContent = CMS.get();
  await renderStudios();
  await renderProjects();
  await renderGallery();
  await renderVideos();
  await renderPackages();
  await renderPortfolio();
  initProjectFilters();
  initStudioBookingOptions();
  if (audioPlayerCleanup) audioPlayerCleanup();
  audioPlayerCleanup = initAudioPlayer();
}

// ── THEME ────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function getContent() {
  return CMS.get();
}

async function mediaUrl(ref) {
  if (!ref) return '';
  return CMS.getMediaUrl(ref);
}

function wfBars() {
  return Array(30).fill('<div class="wf-bar"></div>').join('');
}

async function renderPortfolio() {
  const section = document.getElementById('portfolio');
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  const { tracks } = getContent();

  if (!tracks.length) {
    if (section) section.hidden = true;
    grid.innerHTML = '';
    return;
  }
  if (section) section.hidden = false;

  const cards = await Promise.all(tracks.map(async (t, i) => {
    const src = await mediaUrl(t.audio);
    const num = String(i + 1).padStart(2, '0');
    return `
    <div class="track-card reveal-up" style="--delay:${i * 0.1}s">
      <div class="track-info">
        <div class="track-number">${num}</div>
        <div class="track-meta">
          <h3 class="track-title">${t.title}</h3>
          <span class="track-genre">${t.genre || 'Original Track'}</span>
        </div>
      </div>
      <div class="waveform" aria-hidden="true">${wfBars()}</div>
      <div class="track-controls">
        <button class="play-btn" aria-label="Play or pause ${t.title}">
          <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <div class="track-duration">
          <span class="current-time">0:00</span>
          <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill"></div></div>
          <span class="total-time">0:00</span>
        </div>
        <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="0.8" aria-label="Volume">
      </div>
      <audio preload="none"${src ? ` src="${src}"` : ''}></audio>
    </div>`;
  }));

  grid.innerHTML = cards.join('');
  observeNewReveals(grid);
}

// ── RENDER: STUDIOS ──────────────────────────
async function renderStudios() {
  const section = document.getElementById('studios');
  const grid = document.getElementById('studiosGrid');
  if (!grid) return;
  const { studios } = getContent();

  if (!studios.length) {
    if (section) section.hidden = true;
    grid.innerHTML = '';
    return;
  }
  if (section) section.hidden = false;

  grid.innerHTML = (await Promise.all(studios.map(async s => {
    const imgSrc = await mediaUrl(s.image);
    return `
    <article class="studio-card reveal-up">
      <div class="studio-image">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${s.name}" loading="lazy">`
          : `<div class="studio-image-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
              <span>Studio room</span>
            </div>`}
        <span class="studio-rate">₹${(s.hourlyRate || 0).toLocaleString('en-IN')}/hr</span>
      </div>
      <div class="studio-body">
        <h3>${s.name}</h3>
        <div class="studio-meta">
          <span>👥 ${s.capacity}</span>
          <span>📐 ${s.size}</span>
        </div>
        <p>${s.description}</p>
        <ul class="studio-features">${(s.features || []).map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="studio-book-btn">
          <a href="#booking" class="btn-secondary btn-full studio-select-btn" data-studio="${s.id}">Book The Studio</a>
        </div>
      </div>
    </article>`;
  }))).join('');

  grid.querySelectorAll('.studio-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.studio = btn.dataset.studio;
      document.querySelector('.booking-tab[data-panel="wizard"]')?.click();
      setTimeout(() => {
        document.querySelectorAll('#studioOptions .option-card').forEach(c => {
          c.classList.toggle('selected', c.dataset.value === bookingState.studio);
        });
      }, 300);
    });
  });

  observeNewReveals(grid);
}

// ── RENDER: PROJECTS ─────────────────────────
async function renderProjects(filter = 'all') {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  const { projects } = getContent();
  const filtered = filter === 'all' ? projects : projects.filter(p => p.category === filter);

  if (!filtered.length) {
    grid.innerHTML = `<p class="gallery-upload-hint">Selected work coming soon.</p>`;
    return;
  }

  grid.innerHTML = (await Promise.all(filtered.map(async p => {
    const imgSrc = await mediaUrl(p.image);
    return `
    <article class="project-card reveal-up" data-id="${p.id}">
      <div class="project-thumb">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${p.title}" loading="lazy">`
          : `<div class="project-thumb-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/></svg></div>`}
        <span class="project-category">${CATEGORY_LABELS[p.category] || p.category}</span>
      </div>
      <div class="project-body">
        <h3>${p.title}</h3>
        <p class="project-client">${p.client} · ${p.year}</p>
        <p>${p.description}</p>
      </div>
    </article>`;
  }))).join('');

  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openProjectModal(card.dataset.id));
  });
  observeNewReveals(grid);
}

function initProjectFilters() {
  document.querySelectorAll('#projectFilters .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#projectFilters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProjects(tab.dataset.filter);
    });
  });
}

// ── RENDER: GALLERY ──────────────────────────
async function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const { gallery } = getContent();

  if (!gallery.length) {
    grid.innerHTML = `
      <div class="gallery-upload-hint reveal-up">
        <p>Gallery coming soon.</p>
      </div>`;
    return;
  }

  const items = await Promise.all(gallery.map(async (item, i) => {
    const src = await mediaUrl(item.src);
    return { ...item, src, i };
  }));

  grid.innerHTML = items.map(({ src, caption, i }) => `
    <div class="gallery-item reveal-up" data-index="${i}">
      <img src="${src}" alt="${caption || 'Studio photo'}" loading="lazy">
      <div class="gallery-overlay"><span>${caption || 'Silent Studios'}</span></div>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index, 10);
      openLightbox(items[idx].src, items[idx].caption);
    });
  });
  observeNewReveals(grid);
}

// ── RENDER: VIDEOS ───────────────────────────
async function renderVideos() {
  const section = document.getElementById('video-portfolio');
  const grid = document.getElementById('videosGrid');
  if (!grid) return;
  const { videos } = getContent();

  const items = videos.filter(v => v.src);
  if (!items.length) {
    if (section) section.hidden = true;
    grid.innerHTML = '';
    return;
  }
  if (section) section.hidden = false;

  grid.innerHTML = (await Promise.all(items.map(async v => {
    const src = await mediaUrl(v.src);
    if (!src) return '';
    return `
    <div class="video-card reveal-up">
      <div class="video-wrapper">
        <video controls preload="metadata" src="${src}"></video>
      </div>
      <div class="video-info">
        <h3>${v.title}</h3>
        <p>${v.description || CATEGORY_LABELS[v.category] || ''}</p>
      </div>
    </div>`;
  }))).filter(Boolean).join('');
  if (!grid.innerHTML.trim() && section) section.hidden = true;
  observeNewReveals(grid);
}

// ── RENDER: PACKAGES ─────────────────────────
function renderPackages() {
  const grid = document.getElementById('packagesGrid');
  if (!grid) return;
  const { packages } = getContent();

  grid.innerHTML = packages.map(pkg => `
    <div class="package-card ${pkg.featured ? 'featured' : ''} reveal-up">
      ${pkg.featured ? '<span class="package-badge">Most Popular</span>' : ''}
      <h3>${pkg.name}</h3>
      <div class="package-price">${pkg.price}</div>
      <div class="package-duration">${pkg.duration}</div>
      <ul class="package-features">${(pkg.features || []).map(f => `<li>${f}</li>`).join('')}</ul>
      <a href="#booking" class="btn-primary btn-full package-book-btn" data-package="${pkg.id}">Book Now</a>
    </div>
  `).join('');

  grid.querySelectorAll('.package-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bookingState.package = btn.dataset.package;
      document.querySelector('.booking-tab[data-panel="wizard"]')?.click();
    });
  });
  observeNewReveals(grid);
}

function initStudioBookingOptions() {
  const { studios, packages } = getContent();
  const studioOpts = document.getElementById('studioOptions');
  const pkgOpts = document.getElementById('packageOptions');

  if (studioOpts) {
    studioOpts.innerHTML = studios.map((s, i) => `
      <div class="option-card ${i === 0 ? 'selected' : ''}" data-value="${s.id}">
        <h4>${s.name}</h4><span>₹${(s.hourlyRate || 0).toLocaleString('en-IN')}/hr</span>
      </div>
    `).join('');
    bookingState.studio = studios[0]?.id || null;
    bindOptionCards(studioOpts, 'studio');
  }

  if (pkgOpts) {
    pkgOpts.innerHTML = `<div class="option-card selected" data-value="none"><h4>No Package</h4><span>Pay as you go</span></div>` +
      packages.map(p => `
        <div class="option-card" data-value="${p.id}">
          <h4>${p.name}</h4><span>${p.price}</span>
        </div>
      `).join('');
    bindOptionCards(pkgOpts, 'package');
  }

  bindOptionCards(document.getElementById('serviceOptions'), 'service');
}

function bindOptionCards(container, key) {
  if (!container) return;
  container.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      bookingState[key] = card.dataset.value;
    });
  });
}

// ── BOOKING TABS ─────────────────────────────
function initBookingTabs() {
  document.querySelectorAll('.booking-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.booking-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.booking-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.panel}`)?.classList.add('active');
    });
  });
}

// ── BOOKING WIZARD ───────────────────────────
function initBookingWizard() {
  let currentStep = 1;
  const totalSteps = 4;
  let calDate = new Date();

  const prevBtn = document.getElementById('wizardPrev');
  const nextBtn = document.getElementById('wizardNext');
  const wizardNav = document.getElementById('wizardNav');

  renderCalendar(calDate);
  renderTimeSlots();

  document.getElementById('calPrev')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar(calDate);
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar(calDate);
  });

  document.getElementById('sessionDuration')?.addEventListener('change', e => {
    bookingState.duration = e.target.value;
  });

  initFileUpload();

  prevBtn?.addEventListener('click', () => goStep(currentStep - 1));
  nextBtn?.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === totalSteps) submitBooking();
    else goStep(currentStep + 1);
  });

  function goStep(step) {
    if (step < 1 || step > totalSteps) return;
    if (step === totalSteps) buildSummary();
    currentStep = step;
    document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
    document.querySelector(`.wizard-pane[data-pane="${step}"]`)?.classList.add('active');
    document.querySelectorAll('.wizard-step-indicator').forEach(ind => {
      const n = parseInt(ind.dataset.step, 10);
      ind.classList.toggle('active', n === step);
      ind.classList.toggle('done', n < step);
    });
    prevBtn.disabled = step === 1;
    nextBtn.textContent = step === totalSteps ? 'Confirm Booking' : 'Continue';
  }

  function renderCalendar(date) {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonth');
    if (!grid) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = labels.map(d => `<div class="calendar-day-label">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const iso = cellDate.toISOString().split('T')[0];
      const isPast = cellDate < today;
      const isSunday = cellDate.getDay() === 0;
      const selected = bookingState.date === iso;
      html += `<div class="calendar-day ${isPast || isSunday ? 'disabled' : ''} ${selected ? 'selected' : ''}"
        data-date="${iso}">${d}</div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.calendar-day:not(.empty):not(.disabled)').forEach(day => {
      day.addEventListener('click', () => {
        grid.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        day.classList.add('selected');
        bookingState.date = day.dataset.date;
        renderTimeSlots();
      });
    });
  }

  function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    if (!container) return;
    const slots = ['10:00 AM','11:00 AM','12:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM'];
    const unavailable = [1, 4];

    container.innerHTML = slots.map((slot, i) => {
      const unavail = !bookingState.date || unavailable.includes(i);
      return `<button type="button" class="time-slot ${unavail ? 'unavailable' : ''} ${bookingState.time === slot ? 'selected' : ''}"
        data-slot="${slot}" ${unavail ? 'disabled' : ''}>${slot}</button>`;
    }).join('');

    container.querySelectorAll('.time-slot:not(.unavailable)').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        bookingState.time = btn.dataset.slot;
      });
    });
  }

  function validateStep(step) {
    if (step === 1 && !bookingState.service) {
      alert('Please select a service.');
      return false;
    }
    if (step === 2) {
      if (!bookingState.date) { alert('Please select a date.'); return false; }
      if (!bookingState.time) { alert('Please select a time slot.'); return false; }
    }
    if (step === 4) {
      const name = document.getElementById('bookName')?.value.trim();
      const phone = document.getElementById('bookPhone')?.value.trim();
      const email = document.getElementById('bookEmail')?.value.trim();
      if (!name || !phone || !email) {
        alert('Please fill in all required contact fields.');
        return false;
      }
    }
    return true;
  }

  function buildSummary() {
    const { studios, packages } = getContent();
    const studio = studios.find(s => s.id === bookingState.studio);
    const pkg = packages.find(p => p.id === bookingState.package);
    const el = document.getElementById('bookingSummary');
    if (!el) return;

    el.innerHTML = `
      <h4>Booking Summary</h4>
      <div class="summary-row"><span>Service</span><span>${CATEGORY_LABELS[bookingState.service] || bookingState.service}</span></div>
      <div class="summary-row"><span>Studio</span><span>${studio?.name || '—'}</span></div>
      <div class="summary-row"><span>Package</span><span>${pkg?.name || 'Pay as you go'}</span></div>
      <div class="summary-row"><span>Date</span><span>${bookingState.date || '—'}</span></div>
      <div class="summary-row"><span>Time</span><span>${bookingState.time || '—'}</span></div>
      <div class="summary-row"><span>Duration</span><span>${bookingState.duration} hours</span></div>
      <div class="summary-row"><span>Project</span><span>${document.getElementById('projectName')?.value || '—'}</span></div>
    `;
  }

  function submitBooking() {
    const booking = {
      id: Date.now(),
      ...bookingState,
      projectName: document.getElementById('projectName')?.value,
      projectBrief: document.getElementById('projectBrief')?.value,
      budget: document.getElementById('budgetRange')?.value,
      urgency: document.getElementById('urgency')?.value,
      name: document.getElementById('bookName')?.value,
      phone: document.getElementById('bookPhone')?.value,
      email: document.getElementById('bookEmail')?.value,
      notes: document.getElementById('bookNotes')?.value,
      createdAt: new Date().toISOString()
    };

    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
    bookings.push(booking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

    document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.wizard-pane[data-pane="success"]')?.classList.add('active');
    wizardNav.style.display = 'none';

    const waText = encodeURIComponent(
      `Hi Silent Studios! New booking request:\nName: ${booking.name}\nService: ${booking.service}\nDate: ${booking.date} ${booking.time}\nPhone: ${booking.phone}`
    );
    const waLink = document.querySelector('.booking-success a');
    if (waLink) waLink.href = `https://wa.me/918904799835?text=${waText}`;
  }
}

function initFileUpload() {
  const zone = document.getElementById('refUploadZone');
  const input = document.getElementById('refFileInput');
  const list = document.getElementById('uploadedFiles');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleFiles(input.files));

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      bookingState.files.push(file.name);
      const tag = document.createElement('span');
      tag.className = 'uploaded-file';
      tag.innerHTML = `${file.name} <button type="button" aria-label="Remove">&times;</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        bookingState.files = bookingState.files.filter(f => f !== file.name);
        tag.remove();
      });
      list.appendChild(tag);
    });
  }
}

// ── LIGHTBOX ─────────────────────────────────
function initLightbox() {
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
}

function openLightbox(src, caption) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!lb || !img) return;
  img.src = src;
  img.alt = caption || '';
  lb.classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('open');
}

// ── PROJECT MODAL ────────────────────────────
function initProjectModal() {
  document.getElementById('modalClose')?.addEventListener('click', closeProjectModal);
  document.getElementById('projectModal')?.addEventListener('click', e => {
    if (e.target.id === 'projectModal') closeProjectModal();
  });
}

async function openProjectModal(id) {
  const project = getContent().projects.find(p => p.id === id);
  if (!project) return;
  document.getElementById('modalTitle').textContent = project.title;
  document.getElementById('modalClient').textContent = `${project.client} · ${project.year}`;
  document.getElementById('modalDesc').textContent = project.description;

  const media = document.getElementById('modalMedia');
  media.innerHTML = '';
  if (project.audio) {
    const audioSrc = await mediaUrl(project.audio);
    media.innerHTML = `<audio controls style="width:100%;margin-top:16px" src="${audioSrc}"></audio>`;
  }
  if (project.video) {
    const videoSrc = await mediaUrl(project.video);
    media.innerHTML += `<video controls style="width:100%;margin-top:16px;border-radius:10px" src="${videoSrc}"></video>`;
  }
  document.getElementById('projectModal').classList.add('open');
}

function closeProjectModal() {
  document.getElementById('projectModal')?.classList.remove('open');
}

// ── NAVBAR ───────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger?.classList.remove('active');
      hamburger?.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── PARTICLES ────────────────────────────────
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 3 + 1;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:${Math.random()*30}%;animation-duration:${6+Math.random()*12}s;animation-delay:${Math.random()*8}s;`;
    container.appendChild(p);
  }
}

// ── REVEAL ───────────────────────────────────
function initReveal() {
  document.querySelectorAll('.reveal-up, .reveal-fade').forEach(el => revealObserver.observe(el));
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

function observeNewReveals(container) {
  container.querySelectorAll('.reveal-up, .reveal-fade').forEach(el => revealObserver.observe(el));
}

// ── STATS ────────────────────────────────────
function initStats() {
  document.querySelectorAll('.stat-number').forEach(el => {
    countObserver.observe(el);
  });
}

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.target, 10);
    let current = 0;
    const inc = target / (1800 / 16);
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) { el.textContent = target; clearInterval(timer); }
      else el.textContent = Math.floor(current);
    }, 16);
    countObserver.unobserve(el);
  });
}, { threshold: 0.5 });

// ── AUDIO PLAYER ─────────────────────────────
function initAudioPlayer() {
  const trackCards = Array.from(document.querySelectorAll('.track-card'));
  if (!trackCards.length) return () => {};

  const audios = trackCards.map(c => c.querySelector('audio'));
  const playBtns = trackCards.map(c => c.querySelector('.play-btn'));
  const progFills = trackCards.map(c => c.querySelector('.progress-fill'));
  const currTimes = trackCards.map(c => c.querySelector('.current-time'));
  const progressBars = trackCards.map(c => c.querySelector('.progress-bar'));
  const audioVizBar = document.getElementById('audioVizBar');
  let currentPlaying = null;

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function stopAll() {
    audios.forEach((a, i) => {
      if (a) { a.pause(); a.currentTime = 0; }
      trackCards[i].classList.remove('playing');
      if (progFills[i]) progFills[i].style.width = '0%';
      if (currTimes[i]) currTimes[i].textContent = '0:00';
    });
    audioVizBar?.classList.remove('active');
    currentPlaying = null;
  }

  function playTrack(idx) {
    if (currentPlaying === idx) {
      audios[idx]?.pause();
      trackCards[idx].classList.remove('playing');
      audioVizBar?.classList.remove('active');
      currentPlaying = null;
      return;
    }
    stopAll();
    currentPlaying = idx;
    const audio = audios[idx];
    if (!audio) return;
    audio.play().catch(() => console.info(`Track ${idx + 1}: demo mode`));
    trackCards[idx].classList.add('playing');
    audioVizBar?.classList.add('active');
  }

  playBtns.forEach((btn, idx) => btn?.addEventListener('click', () => playTrack(idx)));

  audios.forEach((audio, idx) => {
    if (!audio) return;
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (progFills[idx]) progFills[idx].style.width = `${pct}%`;
      if (currTimes[idx]) currTimes[idx].textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      trackCards[idx].classList.remove('playing');
      audioVizBar?.classList.remove('active');
      currentPlaying = null;
    });
  });

  progressBars.forEach((bar, idx) => {
    bar?.addEventListener('click', e => {
      if (!audios[idx]?.duration) return;
      const rect = bar.getBoundingClientRect();
      audios[idx].currentTime = ((e.clientX - rect.left) / rect.width) * audios[idx].duration;
    });
  });

  trackCards.forEach((card, i) => {
    const slider = card.querySelector('.volume-slider');
    slider?.addEventListener('input', () => { if (audios[i]) audios[i].volume = slider.value; });
  });

  return () => {
    stopAll();
    playBtns.forEach((btn, idx) => btn?.replaceWith(btn.cloneNode(true)));
  };
}

// ── CONTACT FORM ─────────────────────────────
function initContactForm() {
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;
    setTimeout(() => {
      success?.classList.add('show');
      form.reset();
      btn.textContent = 'Send Message';
      btn.disabled = false;
      setTimeout(() => success?.classList.remove('show'), 5000);
    }, 1200);
  });
}

// ── SMOOTH SCROLL ────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });
}

// ── ACTIVE NAV ───────────────────────────────
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 120;
    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
        navAnchors.forEach(a => {
          a.style.color = a.getAttribute('href') === `#${sec.id}` ? 'var(--cyan)' : '';
        });
      }
    });
  }, { passive: true });
}
