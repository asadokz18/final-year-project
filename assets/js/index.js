// ============================================
// FATA University Hostel - Home Page JS
// ============================================

// ---- NAVBAR SCROLL ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 60);
});

// ---- HAMBURGER ----
document.getElementById('hamburger')?.addEventListener('click', function () {
  this.classList.toggle('active');
  document.getElementById('navMenu')?.classList.toggle('open');
});

// Close menu when nav link clicked on mobile
document.querySelectorAll('#navMenu a').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('hamburger')?.classList.remove('active');
    document.getElementById('navMenu')?.classList.remove('open');
  });
});

// ---- HERO SLIDER ----
let currentSlide = 0;
const slides      = document.querySelectorAll('.hero-slide');
const dotsContainer = document.getElementById('heroDots');

function buildDots() {
  if (!dotsContainer) return;
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1));
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
}

function goToSlide(n) {
  slides[currentSlide]?.classList.remove('active');
  dotsContainer?.querySelectorAll('.hero-dot')[currentSlide]?.classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide]?.classList.add('active');
  dotsContainer?.querySelectorAll('.hero-dot')[currentSlide]?.classList.add('active');
}

document.getElementById('prevSlide')?.addEventListener('click', () => goToSlide(currentSlide - 1));
document.getElementById('nextSlide')?.addEventListener('click', () => goToSlide(currentSlide + 1));

if (slides.length) {
  buildDots();
  setInterval(() => goToSlide(currentSlide + 1), 5000);
}

// ---- SCROLL REVEAL ----
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- TICKER: Update from API ----
async function updateTicker() {
  try {
    const res  = await fetch('api/public.php?action=get_notices&limit=6');
    const data = await res.json();
    if (!data.notices?.length) return;

    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const items = data.notices.map(n => `<span class="ticker-item">${n.title}</span>`).join('');
    track.innerHTML = items + items; // duplicate for seamless loop
  } catch { /* keep default static text */ }
}

// ---- LANDING PAGE AUTH LOGIC ----
/**
 * Checks if the user is logged in before redirecting to protected areas.
 * If not logged in, saves the intended URL and redirects to login page.
 * @param {string} dest - The final destination URL if authorized
 */
async function checkAuthAndGo(dest) {
  try {
    const res  = await fetch('api/auth.php?action=check_session');
    const data = await res.json();
    if (data.logged_in) {
      const map = { Admin: 'admin/dashboard.html', Student: 'student/dashboard.html', Faculty: 'faculty/dashboard.html' };
      window.location.href = map[data.user_role] || dest;
    } else {
      sessionStorage.setItem('intended_url', dest);
      window.location.href = 'login.html';
    }
  } catch {
    sessionStorage.setItem('intended_url', dest);
    window.location.href = 'login.html';
  }
}

document.getElementById('applyNowBtn')?.addEventListener('click', e => {
  e.preventDefault(); checkAuthAndGo('student/dashboard.html');
});
document.getElementById('viewAllRoomsBtn')?.addEventListener('click', e => {
  e.preventDefault(); checkAuthAndGo('student/dashboard.html');
});
document.getElementById('viewGalleryBtn')?.addEventListener('click', e => {
  e.preventDefault(); checkAuthAndGo('student/dashboard.html');
});
document.getElementById('viewAllNoticesBtn')?.addEventListener('click', e => {
  e.preventDefault(); checkAuthAndGo('student/dashboard.html');
});
document.getElementById('exploreRoomsBtn')?.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
});

// ---- LOAD ROOMS ----
/**
 * Fetches available rooms from the public API and renders them in the grid.
 * Falls back to placeholder data if the API call fails.
 */
async function loadRooms() {
  const grid = document.getElementById('roomsGrid');
  if (!grid) return;
  try {
    const res  = await fetch('api/public.php?action=get_rooms&limit=6');
    const data = await res.json();
    if (!data.success || !data.rooms?.length) {
      grid.innerHTML = showRoomsPlaceholder();
      return;
    }
    grid.innerHTML = data.rooms.map(r => `
      <div class="room-card">
        <div class="room-img">
          <img src="${r.room_image || 'assets/images/hero-image1.jpeg'}" alt="Room ${r.room_no}" loading="lazy">
          <span class="room-availability ${r.available_spaces > 0 ? 'room-available' : 'room-full'}">
            ${r.available_spaces > 0 ? '✓ Available' : '✗ Full'}
          </span>
        </div>
        <div class="room-body">
          <h3>Room ${r.room_no}</h3>
          <p>${(r.description || 'Comfortable room with standard facilities.').substring(0, 80)}</p>
          <div class="room-meta">
            <span><i class="fas fa-home"></i> ${r.hostel_name}</span>
            <span><i class="fas fa-bed"></i> ${r.capacity} Beds</span>
            <span><i class="fas fa-door-open"></i> ${r.available_spaces} Free</span>
          </div>
          <a href="#" class="btn btn-primary btn-sm" onclick="checkAuthAndGo('student/dashboard.html');return false;">
            <i class="fas fa-plus"></i> Apply for this Room
          </a>
        </div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = showRoomsPlaceholder();
  }
}

function showRoomsPlaceholder() {
  const rooms = [
    { no:'101', hostel:'FAQIR IPI HOUSE', cap:2, avail:2, desc:'Student room on ground floor with study table and chair.' },
    { no:'102', hostel:'FAQIR IPI HOUSE', cap:2, avail:1, desc:'Spacious room with natural light and two study desks.' },
    { no:'F101', hostel:'FATIMA HOUSE', cap:2, avail:2, desc:'Female hostel room with security and CCTV surveillance.' },
    { no:'F102', hostel:'FATIMA HOUSE', cap:3, avail:2, desc:'Comfortable triple room with wardrobe and study area.' },
    { no:'12', hostel:'KHYBER HOUSE', cap:2, avail:1, desc:'Faculty room on ground floor with two beds.' },
    { no:'13', hostel:'KHYBER HOUSE', cap:1, avail:1, desc:'Single occupancy faculty room with attached bathroom.' },
  ];
  return rooms.map(r => `
    <div class="room-card">
      <div class="room-img">
        <img src="assets/images/${r.hostel==='FAQIR IPI HOUSE'?'FAQIR_IPI_HOUSE':r.hostel==='FATIMA HOUSE'?'FATIMA_HOUSE':'KHYBER_HOUSE'}.jpg" alt="Room" loading="lazy">
        <span class="room-availability ${r.avail>0?'room-available':'room-full'}">${r.avail>0?'✓ Available':'✗ Full'}</span>
      </div>
      <div class="room-body">
        <h3>Room ${r.no}</h3>
        <p>${r.desc}</p>
        <div class="room-meta">
          <span><i class="fas fa-home"></i> ${r.hostel}</span>
          <span><i class="fas fa-bed"></i> ${r.cap} Beds</span>
          <span><i class="fas fa-door-open"></i> ${r.avail} Free</span>
        </div>
        <a href="#" class="btn btn-primary btn-sm" onclick="checkAuthAndGo('student/dashboard.html');return false;"><i class="fas fa-plus"></i> Apply for this Room</a>
      </div>
    </div>
  `).join('');
}

// ---- LOAD NOTICES ----
/**
 * Fetches active notices from the public API and renders them in the grid.
 * Falls back to placeholder data if the API call fails.
 */
async function loadNotices() {
  const grid = document.getElementById('noticesGrid');
  if (!grid) return;
  try {
    const res  = await fetch('api/public.php?action=get_notices&limit=4');
    const data = await res.json();
    if (!data.notices?.length) {
      grid.innerHTML = showNoticesPlaceholder();
      return;
    }
    grid.innerHTML = data.notices.map(n => `
      <div class="notice-card ${n.priority.toLowerCase()}">
        <div class="notice-meta">
          <span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span>
          <span class="notice-date">${formatDate(n.created_at)}</span>
        </div>
        <h3>${n.title}</h3>
        <p>${n.message.substring(0, 150)}${n.message.length > 150 ? '...' : ''}</p>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = showNoticesPlaceholder();
  }
}

function showNoticesPlaceholder() {
  const notices = [
    { priority:'Urgent',    title:'Water Supply Maintenance',      msg:'Water supply suspended Sunday 9AM–12PM for maintenance. Please store water accordingly.',         date:'21 Apr 2026' },
    { priority:'Normal',    title:'Welcome to FATA University Hostel', msg:'Welcome to our hostel. Please read all hostel rules and regulations carefully.',              date:'20 Apr 2026' },
    { priority:'Important', title:'Fee Submission Reminder',       msg:'All hostel fees must be submitted by the 15th of each month. Late fees incur Rs. 200 fine.', date:'19 Apr 2026' },
    { priority:'Important', title:'New Schedule Update',           msg:'Revised meal timings: Breakfast 7AM–9AM, Lunch 1PM–2:30PM, Dinner 7PM–9PM.',                   date:'18 Apr 2026' },
  ];
  return notices.map(n => `
    <div class="notice-card ${n.priority.toLowerCase()}">
      <div class="notice-meta">
        <span class="badge-status badge-${n.priority.toLowerCase()}">${n.priority}</span>
        <span class="notice-date">${n.date}</span>
      </div>
      <h3>${n.title}</h3>
      <p>${n.msg}</p>
    </div>
  `).join('');
}

// ---- LOAD GALLERY ----
/**
 * Fetches approved gallery images and renders them in the gallery section.
 * Implements a lightbox feature for viewing full-size images.
 */
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  try {
    const res  = await fetch('api/public.php?action=get_gallery&limit=6');
    const data = await res.json();
    if (!data.gallery?.length) {
      showGalleryPlaceholder(grid);
      return;
    }
    grid.innerHTML = data.gallery.map(img => `
      <div class="gallery-item" onclick="openLightbox('${img.image_path}')">
        <img src="${img.image_path}" alt="${img.caption || 'Gallery'}" loading="lazy">
        <div class="gallery-item-overlay"><i class="fas fa-expand"></i></div>
      </div>
    `).join('');
  } catch {
    showGalleryPlaceholder(grid);
  }
}

function showGalleryPlaceholder(grid) {
  const imgs = [
    'assets/images/FAQIR_IPI_HOUSE.jpg',
    'assets/images/hero-image1.jpeg',
    'assets/images/hero-image2.jpg',
    'assets/images/FATIMA_HOUSE.jpg',
    'assets/images/hero-image3.jpg',
    'assets/images/KHYBER_HOUSE.jpg',
  ];
  grid.innerHTML = imgs.map(src => `
    <div class="gallery-item" onclick="openLightbox('${src}')">
      <img src="${src}" alt="Gallery" loading="lazy">
      <div class="gallery-item-overlay"><i class="fas fa-expand"></i></div>
    </div>
  `).join('');
}

// ---- LIGHTBOX ----
function openLightbox(src) {
  const overlay = document.getElementById('lightboxOverlay');
  const img     = document.getElementById('lightboxImg');
  if (overlay && img) { img.src = src; overlay.classList.add('active'); }
}
function closeLightbox() {
  document.getElementById('lightboxOverlay')?.classList.remove('active');
}

// ---- CONTACT FORM ----
/**
 * Collects data from the contact form and sends it to the public API.
 * Displays success/error alerts based on the server response.
 */
async function sendContact() {
  const name    = document.getElementById('cName')?.value.trim();
  const email   = document.getElementById('cEmail')?.value.trim();
  const subject = document.getElementById('cSubject')?.value.trim();
  const message = document.getElementById('cMessage')?.value.trim();
  const alertEl = document.getElementById('contactAlert');

  if (!name || !email || !message) {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Please fill all required fields.</div>';
    return;
  }

  const fd = new FormData();
  fd.append('action','contact'); fd.append('name',name);
  fd.append('email',email); fd.append('subject',subject||'General Inquiry'); fd.append('message',message);

  try {
    const res  = await fetch('api/public.php', { method: 'POST', body: fd });
    const data = await res.json();
    if (alertEl) alertEl.innerHTML = `<div class="alert alert-${data.success ? 'success' : 'danger'}">
      <i class="fas fa-${data.success ? 'check-circle' : 'times-circle'}"></i> ${data.message}
    </div>`;
    if (data.success) {
      ['cName','cEmail','cSubject','cMessage'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    }
  } catch {
    if (alertEl) alertEl.innerHTML = '<div class="alert alert-danger"><i class="fas fa-times-circle"></i> Could not send. Please try again.</div>';
  }
}

// ---- SMOOTH SCROLL ----
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href === '#' || href === '#!') return;
    const target = document.querySelector(href);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ---- HELPERS ----
function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return str; }
}

// ---- INIT ----
loadRooms();
loadNotices();
loadGallery();
updateTicker();
