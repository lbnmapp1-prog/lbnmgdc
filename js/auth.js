import { atFetchAll, atPost, atPatch, atDelete } from './airtable.js';

const SESSION_KEY = 'pastoreo_session';

function normUser(rec) {
  const f = rec.fields;
  return { id: rec.id, nombre: f.Nombre || '', email: f.Email || '', password: f.Password || '', rol: f.Rol || 'Líder de Grupo', grupoId: f.GrupoId || '' };
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

// ===== GESTIÓN DE USUARIOS (solo Pastor/Asesor/Super Usuario) =====
export async function getUsuarios() {
  const recs = await atFetchAll('usuarios');
  return recs.map(normUser);
}

export async function createUsuario(fields) {
  const recs = await atFetchAll('usuarios');
  const email = (fields.email || '').trim().toLowerCase();
  if (recs.some(r => (r.fields.Email || '').toLowerCase() === email)) {
    throw new Error('Ya existe un usuario con ese correo.');
  }
  const res = await atPost('usuarios', { records: [{ fields: {
    Nombre: fields.nombre || '',
    Email: fields.email || '',
    Password: fields.password || '',
    Rol: fields.rol || 'Líder de Grupo',
    GrupoId: fields.grupoId || '',
  }}]});
  return normUser(res.records[0]);
}

export async function updateUsuario(id, fields) {
  if (fields.email !== undefined) {
    const recs = await atFetchAll('usuarios');
    const email = (fields.email || '').trim().toLowerCase();
    if (recs.some(r => r.id !== id && (r.fields.Email || '').toLowerCase() === email)) {
      throw new Error('Ya existe otro usuario con ese correo.');
    }
  }
  const patchFields = {};
  if (fields.nombre !== undefined) patchFields.Nombre = fields.nombre;
  if (fields.email !== undefined) patchFields.Email = fields.email;
  if (fields.rol !== undefined) patchFields.Rol = fields.rol;
  if (fields.grupoId !== undefined) patchFields.GrupoId = fields.grupoId;
  if (fields.password) patchFields.Password = fields.password;
  const res = await atPatch('usuarios', id, patchFields);
  return normUser(res);
}

export async function deleteUsuario(id) {
  await atDelete('usuarios', id);
}
