import { login, logout, getSession, getProfile, onAuthChange, solicitarRecuperacion, cambiarPassword } from './auth.js';
import { ENLACE_RECUPERACION } from './supabase.js';
import { renderDashboard } from './views/dashboard.js';
import { renderMiembros } from './views/miembros.js';
import { renderFicha } from './views/ficha.js';
import { renderOrganigrama } from './views/organigrama.js';
import { renderCalendario } from './views/calendario.js';
import { renderReportes } from './views/reportes.js';
import { renderNuevo } from './views/nuevo.js';
import { renderAdmin } from './views/admin.js';
import { renderSeguimiento } from './views/seguimiento.js';
import { renderTemas } from './views/temas.js';

const PAGE_META = {
  dashboard:    ['Inicio', 'Resumen general del área de Jóvenes Adultos'],
  miembros:     ['Miembros', 'Directorio de integrantes del área'],
  ficha:        ['Ficha del miembro', 'Información completa del integrante'],
  organigrama:  ['Organigrama', 'Estructura de liderazgo del área'],
  calendario:   ['Calendario', 'Reuniones y eventos del área'],
  reportes:     ['Reportes', 'Información por Grupo de Cuidado'],
  nuevo:        ['Nuevo registro', 'Ficha Miembro GDC · Anexo D'],
  admin:        ['Administración', 'Usuarios y grupos del sistema'],
  seguimiento:  ['Seguimiento', 'Planificador de citas y conversaciones de discipulado'],
  temas:        ['Organizador de Temas', 'Pilares del área y clases programadas'],
};

let currentProfile = null;

export function getCurrentProfile() { return currentProfile; }
export function isAdmin() { const r = currentProfile?.rol; return r === 'Pastor de Área' || r === 'Líder Asesor' || r === 'Super Usuario'; }
export function isLider() { return currentProfile?.rol === 'Líder de Grupo'; }
export function canManageClaves() { const r = currentProfile?.rol; return r === 'Pastor de Área' || r === 'Super Usuario'; }
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
    case 'seguimiento': await renderSeguimiento(content, navigate); break;
    case 'temas':       await renderTemas(content, navigate); break;
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
    errEl.textContent = e.message.startsWith('Falta') ? e.message : 'Correo o contraseña incorrectos.';
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

// ===== RECUPERAR CONTRASEÑA =====
// "¿Olvidaste tu contraseña?" envía un correo; el enlace vuelve aquí (ENLACE_RECUPERACION)
// y se muestra la pantalla para elegir una contraseña nueva.
(function setupOlvido() {
  const btnLogin = document.getElementById('btn-login');
  if (!btnLogin) return;
  const link = document.createElement('button');
  link.type = 'button';
  link.textContent = '¿Olvidaste tu contraseña?';
  link.style.cssText = 'display:block;margin:12px auto 0;background:none;border:none;color:#1e5aa8;font-weight:600;font-size:13px;cursor:pointer;';
  btnLogin.after(link);
  link.addEventListener('click', async () => {
    const errEl = document.getElementById('login-error');
    const email = document.getElementById('login-email').value.trim();
    errEl.classList.remove('hidden');
    if (!email) { errEl.textContent = 'Escribe tu correo arriba y vuelve a pulsar.'; return; }
    try {
      await solicitarRecuperacion(email);
      errEl.textContent = 'Si el correo está registrado, te enviamos un enlace para elegir una contraseña nueva.';
    } catch (e) { errEl.textContent = e.message; }
  });
})();

function mostrarCambioPassword() {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#0d2440;display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999;';
  ov.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;font-family:inherit;">
      <h2 style="margin:0 0 6px;font-size:20px;">Elige tu contraseña</h2>
      <p style="margin:0 0 16px;color:#6b7690;font-size:14px;">Mínimo 8 caracteres.</p>
      <input id="np1" type="password" autocomplete="new-password" placeholder="Contraseña nueva" class="field-input" style="width:100%;margin-bottom:10px;" />
      <input id="np2" type="password" autocomplete="new-password" placeholder="Repite la contraseña" class="field-input" style="width:100%;" />
      <div id="np-error" class="login-error hidden" style="margin-top:10px;"></div>
      <button id="np-save" class="btn-primary btn-full" style="margin-top:14px;">Guardar y entrar</button>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#np-save').addEventListener('click', async () => {
    const errEl = ov.querySelector('#np-error');
    const p1 = ov.querySelector('#np1').value, p2 = ov.querySelector('#np2').value;
    errEl.classList.remove('hidden');
    if (p1.length < 8) { errEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    if (p1 !== p2) { errEl.textContent = 'Las contraseñas no coinciden.'; return; }
    try {
      await cambiarPassword(p1);
      history.replaceState(null, '', location.pathname);
      location.reload();
    } catch (e) { errEl.textContent = e.message; }
  });
}

// ===== INIT =====
(async () => {
  if (ENLACE_RECUPERACION) { mostrarCambioPassword(); return; }
  try {
    const session = await getSession();
    if (session) {
      const profile = await getProfile();
      await showApp(profile);
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
    const errEl = document.getElementById('login-error');
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  }
})();
