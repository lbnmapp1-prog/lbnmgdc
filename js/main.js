import { login, logout, getSession, getProfile, onAuthChange } from './auth.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMiembros } from './views/miembros.js';
import { renderFicha } from './views/ficha.js';
import { renderOrganigrama } from './views/organigrama.js';
import { renderCalendario } from './views/calendario.js';
import { renderReportes } from './views/reportes.js';
import { renderNuevo } from './views/nuevo.js';
import { renderAdmin } from './views/admin.js';

const PAGE_META = {
  dashboard:   ['Inicio', 'Resumen general del área de Jóvenes Adultos'],
  miembros:    ['Miembros', 'Directorio de integrantes del área'],
  ficha:       ['Ficha del miembro', 'Información completa del integrante'],
  organigrama: ['Organigrama', 'Estructura de liderazgo del área'],
  calendario:  ['Calendario', 'Reuniones y eventos del área'],
  reportes:    ['Reportes', 'Información por Grupo de Cuidado'],
  nuevo:       ['Nuevo registro', 'Ficha Miembro GDC · Anexo D'],
  admin:       ['Administración', 'Usuarios y grupos del sistema'],
};

let currentProfile = null;

export function getCurrentProfile() { return currentProfile; }
export function isAdmin() { const r = currentProfile?.rol; return r === 'Pastor de Área' || r === 'Líder Asesor'; }
export function isLider() { return currentProfile?.rol === 'Líder de Grupo'; }
export function getCurrentGrupoId() { return currentProfile?.grupoId || null; }

// ===== NAVIGATION =====
async function navigate(page, params = {}) {
  const content = document.getElementById('main-content');
  const [title, sub] = PAGE_META[page] || PAGE_META.dashboard;
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-sub').textContent = sub;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  switch (page) {
    case 'dashboard':   await renderDashboard(content, navigate); break;
    case 'miembros':    await renderMiembros(content, navigate, params); break;
    case 'ficha':       await renderFicha(content, navigate, params); break;
    case 'organigrama': await renderOrganigrama(content, navigate); break;
    case 'calendario':  await renderCalendario(content, navigate); break;
    case 'reportes':    await renderReportes(content, navigate, params); break;
    case 'nuevo':       await renderNuevo(content, navigate, params); break;
    case 'admin':       await renderAdmin(content, navigate); break;
    default:            await renderDashboard(content, navigate);
  }
}

// Expose to inline onclick handlers
window.navigate = navigate;

// ===== AUTH FLOW =====
function showLogin() {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('view-app').classList.add('hidden');
}

async function showApp(profile) {
  currentProfile = profile;
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-app').classList.remove('hidden');

  const name = profile?.nombre || profile?.email || 'Usuario';
  const role = profile?.rol || '—';
  const initials = name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();

  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-role').textContent = role;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('topbar-name').textContent = name;
  document.getElementById('topbar-role').textContent = role;
  document.getElementById('topbar-avatar').textContent = initials;

  const adminNav = document.querySelector('.nav-item.admin-only');
  if (adminNav) adminNav.style.display = isAdmin() ? '' : 'none';

  await navigate('dashboard');
}

// ===== LOGIN =====
document.getElementById('btn-login')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  errEl.classList.add('hidden');
  btn.textContent = 'Ingresando...';
  btn.disabled = true;
  try {
    await login(email, password);
    const profile = await getProfile();
    await showApp(profile);
  } catch (e) {
    errEl.textContent = 'Correo o contraseña incorrectos.';
    errEl.classList.remove('hidden');
    btn.textContent = 'Ingresar al sistema';
    btn.disabled = false;
  }
});

// Enter key on login fields
['login-email','login-password'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
});

// ===== LOGOUT =====
document.getElementById('btn-logout')?.addEventListener('click', async () => { await logout(); });
document.getElementById('btn-logout-mobile')?.addEventListener('click', async () => { await logout(); });

// ===== SIDEBAR NAV =====
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ===== GLOBAL SEARCH =====
document.getElementById('global-search')?.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  if (q.length > 0) navigate('miembros', { search: q });
});

// ===== AUTH STATE LISTENER =====
onAuthChange(async (session) => {
  if (session) {
    const profile = await getProfile();
    await showApp(profile);
  } else {
    showLogin();
  }
});

// ===== INIT =====
(async () => {
  const session = await getSession();
  if (session) {
    const profile = await getProfile();
    await showApp(profile);
  } else {
    showLogin();
  }
})();
