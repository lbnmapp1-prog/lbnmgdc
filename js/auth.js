// Autenticación simple — cambia APP_PASSWORD para proteger el acceso
const APP_PASSWORD = 'LBN2025';
const SESSION_KEY  = 'pastoreo_session';

const ADMIN_PROFILE = {
  nombre: 'Pastor Daniel Rivas',
  rol: 'Pastor de Área',
};

export async function login(email, password) {
  if (password !== APP_PASSWORD) throw new Error('Contraseña incorrecta');
  const session = { loggedIn: true, ts: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export async function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s.loggedIn ? s : null;
  } catch {
    return null;
  }
}

export async function getProfile() {
  return ADMIN_PROFILE;
}

export function onAuthChange(callback) {
  // No-op: la sesión se comprueba en el init, no hay cambios asíncronos
  return () => {};
}
