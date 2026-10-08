// Función de Vercel: operaciones privilegiadas sobre usuarios del sistema.
// Corre en el servidor: la SUPABASE_SERVICE_ROLE_KEY nunca llega al navegador.
// Cada petición se valida contra el rol real de quien llama (tabla `perfiles`).
//
// Variables de entorno (Vercel > Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

const ROLES_ALTOS = ['Pastor de Área', 'Super Usuario'];
const ROLES_ADMIN = ['Pastor de Área', 'Líder Asesor', 'Super Usuario'];
const ROLES_VALIDOS = ['Líder de Grupo', 'Líder Asesor', 'Pastor de Área', 'Super Usuario'];

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Las claves nuevas de Supabase (sb_publishable_ / sb_secret_) no son JWT: van solo en
// `apikey`. Las claves antiguas (eyJ...) también se aceptan como Bearer.
function cabecerasAuth(key, token) {
  if (token) return { apikey: key, Authorization: `Bearer ${token}` };
  return key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

async function sb(path, { method = 'GET', body, key = SUPABASE_SERVICE_ROLE_KEY, token, headers = {} } = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      ...cabecerasAuth(key, token),
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) throw new HttpError(400, data?.msg || data?.message || data?.error_description || data?.error || `Error ${r.status}`);
  return data;
}

async function getCaller(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  let user;
  try { user = await sb('/auth/v1/user', { key: SUPABASE_ANON_KEY, token }); } catch { return null; }
  if (!user?.id) return null;
  const rows = await sb(`/rest/v1/perfiles?id=eq.${user.id}&select=id,rol,nombre`);
  return rows?.[0] || null;
}

async function audit(caller, accion, entidadId, detalle) {
  await sb('/rest/v1/auditoria', {
    method: 'POST',
    body: { actor_id: caller.id, accion, entidad: 'perfiles', entidad_id: entidadId, detalle },
    headers: { Prefer: 'return=minimal' },
  });
}

async function contarAltos() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?select=id&rol=in.(${ROLES_ALTOS.map(x => `"${x}"`).join(',')})`, {
    headers: { ...cabecerasAuth(SUPABASE_SERVICE_ROLE_KEY), Prefer: 'count=exact', Range: '0-0' },
  });
  return Number((r.headers.get('content-range') || '').split('/')[1] || 0);
}

async function crear(caller, body) {
  const { nombre, email, password, rol, grupoId } = body;
  if (!nombre || !email || !password || !rol) throw new HttpError(400, 'Nombre, correo, contraseña y rol son requeridos.');
  if (!ROLES_VALIDOS.includes(rol)) throw new HttpError(400, 'Rol inválido.');
  if (ROLES_ALTOS.includes(rol) && !ROLES_ALTOS.includes(caller.rol)) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden asignar ese rol.');
  if (String(password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');

  const created = await sb('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true } });
  try {
    await sb('/rest/v1/perfiles', {
      method: 'POST',
      body: { id: created.id, nombre, email, rol, grupo_id: grupoId || null },
      headers: { Prefer: 'return=minimal' },
    });
  } catch (e) {
    await sb(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' }).catch(() => {});
    throw e;
  }
  await audit(caller, 'crear_usuario', created.id, { nombre, email, rol });
  return { id: created.id };
}

async function editar(caller, body) {
  const { id, nombre, email, rol, grupoId, password } = body;
  if (!id) throw new HttpError(400, 'Falta id.');
  if (rol && !ROLES_VALIDOS.includes(rol)) throw new HttpError(400, 'Rol inválido.');

  const rows = await sb(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}&select=email,rol`);
  const existente = rows?.[0];
  if (!existente) throw new HttpError(404, 'Usuario no encontrado.');
  const alto = ROLES_ALTOS.includes(caller.rol);
  const correoCambia = email !== undefined && email !== existente.email;

  if (ROLES_ALTOS.includes(existente.rol) && !alto) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden editar a ese usuario.');
  if (rol && ROLES_ALTOS.includes(rol) && !alto) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden asignar ese rol.');
  if (password && !alto) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden cambiar contraseñas.');
  if (correoCambia && !alto) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden cambiar el correo.');
  if (password && String(password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.');
  if (existente.rol !== rol && rol && ROLES_ALTOS.includes(existente.rol) && !ROLES_ALTOS.includes(rol) && await contarAltos() <= 1) {
    throw new HttpError(400, 'No puedes quitarle el rol al último Pastor de Área / Super Usuario.');
  }

  const authUpdates = {};
  if (correoCambia) { authUpdates.email = email; authUpdates.email_confirm = true; }
  if (password) authUpdates.password = password;
  if (Object.keys(authUpdates).length) await sb(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: authUpdates });

  const perfil = {};
  if (nombre !== undefined) perfil.nombre = nombre;
  if (email !== undefined) perfil.email = email;
  if (rol !== undefined) perfil.rol = rol;
  if (grupoId !== undefined) perfil.grupo_id = grupoId || null;
  if (Object.keys(perfil).length) {
    await sb(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: perfil, headers: { Prefer: 'return=minimal' } });
  }
  await audit(caller, password ? 'cambiar_clave' : 'editar_usuario', id, { nombre, email, rol, grupoId });
  return { ok: true };
}

async function eliminar(caller, body) {
  const { id } = body;
  if (!id) throw new HttpError(400, 'Falta id.');
  if (id === caller.id) throw new HttpError(400, 'No puedes eliminar tu propia cuenta.');
  const rows = await sb(`/rest/v1/perfiles?id=eq.${encodeURIComponent(id)}&select=rol`);
  const destino = rows?.[0];
  if (destino && ROLES_ALTOS.includes(destino.rol)) {
    if (!ROLES_ALTOS.includes(caller.rol)) throw new HttpError(403, 'Solo Pastor de Área o Super Usuario pueden eliminar a ese usuario.');
    if (await contarAltos() <= 1) throw new HttpError(400, 'No puedes eliminar al último Pastor de Área / Super Usuario del sistema.');
  }
  await sb(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  await audit(caller, 'eliminar_usuario', id, {});
  return { ok: true };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return send(500, { error: 'Servidor sin configurar.' });
    const caller = await getCaller(req);
    if (!caller || !ROLES_ADMIN.includes(caller.rol)) return send(403, { error: 'No autorizado.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (req.method === 'POST') return send(200, await crear(caller, body));
    if (req.method === 'PATCH') return send(200, await editar(caller, body));
    if (req.method === 'DELETE') return send(200, await eliminar(caller, body));
    return send(405, { error: 'Método no soportado.' });
  } catch (e) {
    if (e instanceof HttpError) return send(e.status, { error: e.message });
    return send(500, { error: 'Error del servidor.' });
  }
};
