// ============================================
// SILENT STUDIOS — On-site Admin Panel
// ============================================

(function () {
  const SECTIONS = [
    { id: 'tracks', label: 'Audio Tracks', icon: '🎵' },
    { id: 'videos', label: 'Videos', icon: '🎬' },
    { id: 'gallery', label: 'Photos', icon: '📷' },
    { id: 'projects', label: 'Projects', icon: '💿' },
    { id: 'studios', label: 'Studio Rooms', icon: '🎙️' },
    { id: 'packages', label: 'Packages', icon: '💎' },
    { id: 'bookings', label: 'Bookings', icon: '📅' }
  ];

  let activeSection = 'tracks';
  let _rowActions = [];

  document.addEventListener('DOMContentLoaded', () => {
    initAdminUI();
    if (CMS.isAdmin()) showAdminMode();
    if (location.hash === '#admin') openAdminLogin();
  });

  function initAdminUI() {
    document.getElementById('adminLoginBtn')?.addEventListener('click', openAdminLogin);
    document.getElementById('adminLoginForm')?.addEventListener('submit', e => {
      e.preventDefault();
      if (CMS.login(document.getElementById('adminLoginPass').value)) {
        closeAdminLogin();
        showAdminMode();
        openAdminPanel();
      } else {
        document.getElementById('adminLoginError').hidden = false;
      }
    });
    document.getElementById('adminLoginClose')?.addEventListener('click', closeAdminLogin);
    document.getElementById('adminPanelClose')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      CMS.logout();
      hideAdminMode();
      closeAdminPanel();
    });
    document.getElementById('adminFab')?.addEventListener('click', openAdminPanel);
    document.getElementById('adminExportBtn')?.addEventListener('click', () => CMS.exportJSON());
    document.getElementById('adminImportInput')?.addEventListener('change', async e => {
      if (e.target.files[0]) {
        await CMS.importJSON(e.target.files[0]);
        renderAdminSection(activeSection);
        window.dispatchEvent(new Event('site-content-updated'));
        alert('Content imported! The site has been updated.');
      }
    });
    document.getElementById('adminRefreshBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new Event('site-content-updated'));
      renderAdminSection(activeSection);
    });
    document.getElementById('adminAddBtn')?.addEventListener('click', () => showAdminForm());
  }

  function openAdminLogin() {
    document.getElementById('adminLoginModal')?.classList.add('open');
    document.getElementById('adminLoginPass')?.focus();
  }

  function closeAdminLogin() {
    document.getElementById('adminLoginModal')?.classList.remove('open');
    document.getElementById('adminLoginError').hidden = true;
    document.getElementById('adminLoginPass').value = '';
  }

  function showAdminMode() {
    document.body.classList.add('admin-mode');
    document.getElementById('adminFab')?.classList.remove('hidden');
    document.getElementById('adminLoginBtn')?.classList.add('hidden');
  }

  function hideAdminMode() {
    document.body.classList.remove('admin-mode');
    document.getElementById('adminFab')?.classList.add('hidden');
    document.getElementById('adminLoginBtn')?.classList.remove('hidden');
  }

  function openAdminPanel() {
    document.getElementById('adminPanel')?.classList.add('open');
    renderAdminNav();
    renderAdminSection(activeSection);
  }

  function closeAdminPanel() {
    document.getElementById('adminPanel')?.classList.remove('open');
  }

  function renderAdminNav() {
    const nav = document.getElementById('adminPanelNav');
    if (!nav) return;
    nav.innerHTML = SECTIONS.map(s =>
      `<button type="button" class="admin-panel-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">${s.icon} ${s.label}</button>`
    ).join('');
    nav.querySelectorAll('.admin-panel-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.section;
        renderAdminNav();
        renderAdminSection(activeSection);
        document.getElementById('adminFormArea').hidden = true;
      });
    });
  }

  function renderAdminSection(section) {
    const list = document.getElementById('adminList');
    const title = document.getElementById('adminSectionTitle');
    const addBtn = document.getElementById('adminAddBtn');
    if (!list) return;

    title.textContent = SECTIONS.find(s => s.id === section)?.label || section;
    addBtn.style.display = section === 'bookings' ? 'none' : 'inline-flex';

    const c = CMS.get();
    _rowActions = [];

    switch (section) {
      case 'tracks':
        list.innerHTML = c.tracks.length ? c.tracks.map(t => itemRow(t.title, `${t.genre} · ${t.audio || 'no file'}`, [
          { label: 'Edit', action: () => showTrackForm(t) },
          { label: 'Delete', danger: true, action: () => deleteItem('tracks', t.id) }
        ])).join('') : emptyMsg('No audio tracks. Click "+ Add New".');
        break;
      case 'videos':
        list.innerHTML = c.videos.length ? c.videos.map(v => itemRow(v.title, v.description || '', [
          { label: 'Edit', action: () => showVideoForm(v) },
          { label: 'Delete', danger: true, action: () => deleteItem('videos', v.id) }
        ])).join('') : emptyMsg('No videos yet.');
        break;
      case 'gallery':
        list.innerHTML = c.gallery.length ? c.gallery.map((g, i) => itemRow(g.caption || 'Photo', g.src || '', [
          { label: 'Delete', danger: true, action: () => deleteGallery(i) }
        ], g.src && !g.src.startsWith('idb:') ? g.src : null)).join('') : emptyMsg('No photos yet.');
        break;
      case 'projects':
        list.innerHTML = c.projects.length ? c.projects.map(p => itemRow(p.title, `${p.client} · ${p.year}`, [
          { label: 'Edit', action: () => showProjectForm(p) },
          { label: 'Delete', danger: true, action: () => deleteItem('projects', p.id) }
        ])).join('') : emptyMsg('No projects yet.');
        break;
      case 'studios':
        list.innerHTML = c.studios.map(s => itemRow(s.name, `₹${s.hourlyRate}/hr`, [
          { label: 'Edit', action: () => showStudioForm(s) }
        ])).join('');
        break;
      case 'packages':
        list.innerHTML = c.packages.map(p => itemRow(p.name, p.price, [
          { label: 'Edit', action: () => showPackageForm(p) }
        ])).join('');
        break;
      case 'bookings':
        const bookings = JSON.parse(localStorage.getItem('silent_studios_bookings') || '[]');
        list.innerHTML = bookings.length ? [...bookings].reverse().map(b => itemRow(b.name, `${b.service} · ${b.phone}`, [
          { label: 'WhatsApp', action: () => window.open(`https://wa.me/91${(b.phone || '').replace(/\D/g, '')}`, '_blank') },
          { label: 'Delete', danger: true, action: () => deleteBooking(b.id) }
        ])).join('') : emptyMsg('No bookings yet.');
        break;
    }

    list.querySelectorAll('.admin-list-row').forEach(row => {
      const idx = parseInt(row.dataset.actionIdx, 10);
      row.querySelectorAll('.admin-list-btn').forEach(btn => {
        btn.addEventListener('click', () => _rowActions[idx]?.[parseInt(btn.dataset.action, 10)]?.action());
      });
    });
  }

  function emptyMsg(msg) {
    return `<div class="admin-list-empty">${msg}</div>`;
  }

  function itemRow(title, sub, actions, thumbSrc) {
    _rowActions.push(actions);
    const idx = _rowActions.length - 1;
    const thumb = thumbSrc
      ? `<img class="admin-list-thumb" src="${thumbSrc}" alt="">`
      : `<div class="admin-list-thumb">🎵</div>`;
    return `<div class="admin-list-row" data-action-idx="${idx}">${thumb}<div class="admin-list-info"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div><div class="admin-list-actions">${actions.map((a, i) => `<button type="button" class="admin-list-btn ${a.danger ? 'danger' : ''}" data-action="${i}">${a.label}</button>`).join('')}</div></div>`;
  }

  function showAdminForm() {
    if (activeSection === 'tracks') showTrackForm(null);
    else if (activeSection === 'videos') showVideoForm(null);
    else if (activeSection === 'gallery') showGalleryForm();
    else if (activeSection === 'projects') showProjectForm(null);
    else if (activeSection === 'studios') showStudioForm(null);
    else if (activeSection === 'packages') showPackageForm(null);
  }

  function showForm(title, html, onSubmit) {
    const area = document.getElementById('adminFormArea');
    area.hidden = false;
    area.innerHTML = `<h4>${title}</h4><form id="adminActiveForm">${html}<div class="admin-form-actions"><button type="button" class="btn-secondary" id="adminFormCancel">Cancel</button><button type="submit" class="btn-primary">Save & Update Site</button></div></form>`;
    document.getElementById('adminFormCancel').onclick = () => { area.hidden = true; };
    document.getElementById('adminActiveForm').onsubmit = async e => {
      e.preventDefault();
      await onSubmit(new FormData(e.target));
      area.hidden = true;
      renderAdminSection(activeSection);
      window.dispatchEvent(new Event('site-content-updated'));
    };
  }

  function fileField(name, label, accept, hint) {
    return `<div class="form-group"><label>${label}</label><input type="file" name="${name}" accept="${accept}"><small class="admin-field-hint">${hint || 'Upload OR type path below'}</small><input type="text" name="${name}Path" placeholder="assets/audio/my-track.mp3" class="admin-path-input"></div>`;
  }

  async function resolveUpload(formData, fieldName, folder) {
    const pathVal = formData.get(fieldName + 'Path')?.trim();
    if (pathVal) return pathVal;
    const file = formData.get(fieldName);
    if (file && file.size > 0) return await CMS.uploadFile(file, { folder });
    return '';
  }

  function showTrackForm(track) {
    showForm(track ? 'Edit Audio Track' : 'Add Audio Track', `
      <input type="hidden" name="id" value="${track?.id || ''}">
      <div class="form-group"><label>Track Title</label><input type="text" name="title" value="${esc(track?.title)}" required></div>
      <div class="form-group"><label>Genre</label><input type="text" name="genre" value="${esc(track?.genre || 'Original Track')}"></div>
      ${fileField('audio', 'Audio File (MP3)', 'audio/*', 'Upload MP3 or path: assets/audio/track.mp3')}
      <p class="admin-field-hint">Current file: ${esc(track?.audio || 'none')}</p>
    `, async fd => {
      const c = CMS.get();
      const id = fd.get('id') || 't' + Date.now();
      let audio = await resolveUpload(fd, 'audio', 'assets/audio');
      if (!audio && track?.audio) audio = track.audio;
      const item = { id, title: fd.get('title'), genre: fd.get('genre'), audio };
      const idx = c.tracks.findIndex(t => t.id === id);
      if (idx >= 0) c.tracks[idx] = item; else c.tracks.push(item);
      await CMS.save(c);
    });
  }

  function showVideoForm(video) {
    showForm(video ? 'Edit Video' : 'Add Video', `
      <input type="hidden" name="id" value="${video?.id || ''}">
      <div class="form-group"><label>Title</label><input type="text" name="title" value="${esc(video?.title)}" required></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="2">${esc(video?.description)}</textarea></div>
      ${fileField('video', 'Video (MP4)', 'video/*', 'Upload or path: assets/videos/reel.mp4')}
      <p class="admin-field-hint">Current: ${esc(video?.src || 'none')}</p>
    `, async fd => {
      const c = CMS.get();
      const id = fd.get('id') || 'v' + Date.now();
      let src = await resolveUpload(fd, 'video', 'assets/videos');
      if (!src && video?.src) src = video.src;
      const item = { id, title: fd.get('title'), description: fd.get('description'), category: video?.category || 'behind-the-scenes', src };
      const idx = c.videos.findIndex(v => v.id === id);
      if (idx >= 0) c.videos[idx] = item; else c.videos.push(item);
      await CMS.save(c);
    });
  }

  function showGalleryForm() {
    showForm('Add Gallery Photo', `
      ${fileField('image', 'Photo', 'image/*', 'Upload or path: assets/images/studio.jpg')}
      <div class="form-group"><label>Caption</label><input type="text" name="caption"></div>
    `, async fd => {
      const c = CMS.get();
      const src = await resolveUpload(fd, 'image', 'assets/images');
      if (!src) { alert('Upload an image or enter a path.'); return; }
      c.gallery.push({ src, caption: fd.get('caption') });
      await CMS.save(c);
    });
  }

  function showProjectForm(project) {
    showForm(project ? 'Edit Project' : 'Add Project', `
      <input type="hidden" name="id" value="${project?.id || ''}">
      <div class="form-group"><label>Title</label><input type="text" name="title" value="${esc(project?.title)}" required></div>
      <div class="form-group"><label>Client</label><input type="text" name="client" value="${esc(project?.client)}"></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="2">${esc(project?.description)}</textarea></div>
      ${fileField('image', 'Cover Image', 'image/*', '')}
      ${fileField('audio', 'Audio Sample', 'audio/*', '')}
    `, async fd => {
      const c = CMS.get();
      const id = fd.get('id') || 'p' + Date.now();
      let image = await resolveUpload(fd, 'image', 'assets/images');
      let audio = await resolveUpload(fd, 'audio', 'assets/audio');
      if (!image && project?.image) image = project.image;
      if (!audio && project?.audio) audio = project.audio;
      const item = { id, title: fd.get('title'), client: fd.get('client'), category: project?.category || 'music-production', year: project?.year || '2025', description: fd.get('description'), image, audio, video: project?.video || '' };
      const idx = c.projects.findIndex(p => p.id === id);
      if (idx >= 0) c.projects[idx] = item; else c.projects.push(item);
      await CMS.save(c);
    });
  }

  function showStudioForm(studio) {
    showForm('Edit Studio Room', `
      <input type="hidden" name="id" value="${studio?.id || ''}">
      <div class="form-group"><label>Room Name</label><input type="text" name="name" value="${esc(studio?.name)}" required></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="2">${esc(studio?.description)}</textarea></div>
      <div class="form-group"><label>Hourly Rate (₹)</label><input type="number" name="hourlyRate" value="${studio?.hourlyRate || 2000}"></div>
      ${fileField('image', 'Room Photo', 'image/*', '')}
    `, async fd => {
      const c = CMS.get();
      const id = fd.get('id') || 's' + Date.now();
      let image = await resolveUpload(fd, 'image', 'assets/images');
      if (!image && studio?.image) image = studio.image;
      const idx = c.studios.findIndex(s => s.id === id);
      const item = { ...studio, id, name: fd.get('name'), description: fd.get('description'), hourlyRate: parseInt(fd.get('hourlyRate'), 10), image };
      if (idx >= 0) c.studios[idx] = item; else c.studios.push(item);
      await CMS.save(c);
    });
  }

  function showPackageForm(pkg) {
    showForm('Edit Package', `
      <input type="hidden" name="id" value="${pkg?.id || ''}">
      <div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(pkg?.name)}" required></div>
      <div class="form-group"><label>Price</label><input type="text" name="price" value="${esc(pkg?.price)}"></div>
      <div class="form-group"><label>Duration</label><input type="text" name="duration" value="${esc(pkg?.duration)}"></div>
      <div class="form-group"><label>Features (one per line)</label><textarea name="features" rows="4">${esc((pkg?.features || []).join('\n'))}</textarea></div>
    `, async fd => {
      const c = CMS.get();
      const id = fd.get('id') || 'pkg' + Date.now();
      const item = { id, name: fd.get('name'), price: fd.get('price'), duration: fd.get('duration'), featured: pkg?.featured || false, features: fd.get('features').split('\n').map(s => s.trim()).filter(Boolean) };
      const idx = c.packages.findIndex(p => p.id === id);
      if (idx >= 0) c.packages[idx] = item; else c.packages.push(item);
      await CMS.save(c);
    });
  }

  async function deleteItem(array, id) {
    if (!confirm('Delete this item?')) return;
    const c = CMS.get();
    c[array] = c[array].filter(x => x.id !== id);
    await CMS.save(c);
    renderAdminSection(activeSection);
    window.dispatchEvent(new Event('site-content-updated'));
  }

  async function deleteGallery(index) {
    if (!confirm('Delete this photo?')) return;
    const c = CMS.get();
    c.gallery.splice(index, 1);
    await CMS.save(c);
    renderAdminSection(activeSection);
    window.dispatchEvent(new Event('site-content-updated'));
  }

  function deleteBooking(id) {
    if (!confirm('Delete?')) return;
    let bookings = JSON.parse(localStorage.getItem('silent_studios_bookings') || '[]');
    localStorage.setItem('silent_studios_bookings', JSON.stringify(bookings.filter(b => b.id !== id)));
    renderAdminSection('bookings');
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  window.openAdminPanel = openAdminPanel;
})();
