import { supabase, CONFIGURADO } from './supabase.js';

function normPerfil(p) {
  return { id: p.id, nombre: p.nombre || '', email: p.email || '', rol: p.rol || 'Líder de Grupo', grupoId: p.grupo_id || '' };
}

export async function login(email, password) {
  if (!CONFIGURADO) throw new Error('Falta configurar Supabase en js/config.js');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('Correo o contraseña incorrectos');
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

export async function getSession() {
  if (!CONFIGURADO) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Perfil del usuario con sesión iniciada (rol y grupo salen de la tabla `perfiles`, protegida por RLS).
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
  if (error || !data) {
    await supabase.auth.signOut();
    throw new Error('Tu usuario no tiene perfil en el sistema. Pide a un administrador que lo cree.');
  }
  return normPerfil(data);
}

// Solo avisa cuando la sesión se cierra (vencida o cerrada en otra pestaña).
// El inicio de sesión lo maneja main.js directamente.
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') callback(null);
  });
  return () => data.subscription.unsubscribe();
}

export async function solicitarRecuperacion(email) {
  if (!CONFIGURADO) throw new Error('Falta configurar Supabase en js/config.js');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw new Error(error.message);
}

export async function cambiarPassword(nueva) {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw new Error(error.message);
}

// ===== GESTIÓN DE USUARIOS (solo Pastor / Asesor / Super Usuario) =====
function normUser(u) {
  return { id: u.id, nombre: u.nombre || '', email: u.email || '', rol: u.rol || 'Líder de Grupo', grupoId: u.grupo_id || '' };
}

// Cualquier usuario autenticado ve nombre/rol/grupo (para el organigrama); el correo
// solo lo devuelve la base a los administradores (RLS sobre `perfiles`).
export async function getUsuarios() {
  const [basico, conCorreo] = await Promise.all([
    supabase.rpc('listar_usuarios_basico'),
    supabase.from('perfiles').select('id,email'),
  ]);
  if (basico.error) throw new Error(basico.error.message);
  const correos = Object.fromEntries((conCorreo.data || []).map(p => [p.id, p.email]));
  return basico.data.map(u => normUser({ ...u, email: correos[u.id] || '' }));
}

// Crear, editar y borrar usuarios requiere la service_role key, que vive solo en el
// servidor: se hace a través de /api/admin-users (api/admin-users.js).
async function adminUsers(method, body) {
  const session = await getSession();
  if (!session) throw new Error('Sesión vencida. Vuelve a iniciar sesión.');
  const r = await fetch('/api/admin-users', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

export async function createUsuario(fields) {
  const { id } = await adminUsers('POST', {
    nombre: fields.nombre, email: fields.email, password: fields.password, rol: fields.rol, grupoId: fields.grupoId || null,
  });
  return { id, nombre: fields.nombre, email: fields.email, rol: fields.rol, grupoId: fields.grupoId || '' };
}

export async function updateUsuario(id, fields) {
  await adminUsers('PATCH', {
    id, nombre: fields.nombre, email: fields.email, rol: fields.rol, grupoId: fields.grupoId, password: fields.password || undefined,
  });
}

export async function deleteUsuario(id) {
  await adminUsers('DELETE', { id });
}
