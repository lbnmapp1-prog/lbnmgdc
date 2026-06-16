import { atFetchAll, atPost, atPatch, atDelete } from './airtable.js';

const SESSION_KEY = 'pastoreo_session';

function normUser(rec) {
  const f = rec.fields;
  return { id: rec.id, nombre: f.Nombre || '', email: f.Email || '', rol: f.Rol || 'Líder de Grupo', grupoId: f.GrupoId || '' };
}

export async function login(email, password) {
  const recs = await atFetchAll('usuarios');
  const match = recs.find(r => (r.fields.Email || '').toLowerCase() === email.toLowerCase() && r.fields.Password === password);
  if (!match) throw new Error('Correo o contraseña incorrectos');
  const user = normUser(match);
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export async function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getProfile() {
  return getSession();
}

export function onAuthChange(callback) {
  return () => {};
}

// ===== GESTIÓN DE USUARIOS (solo Pastor/Asesor) =====
export async function getUsuarios() {
  const recs = await atFetchAll('usuarios');
  return recs.map(normUser);
}

export async function createUsuario(fields) {
  const res = await atPost('usuarios', { records: [{ fields: {
    Nombre: fields.nombre || '',
    Email: fields.email || '',
    Password: fields.password || '',
    Rol: fields.rol || 'Líder de Grupo',
    GrupoId: fields.grupoId || '',
  }}]});
  return normUser(res.records[0]);
}

export async function deleteUsuario(id) {
  await atDelete('usuarios', id);
}
