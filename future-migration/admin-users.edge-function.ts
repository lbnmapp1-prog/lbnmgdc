// Edge Function: operaciones privilegiadas sobre usuarios del sistema.
// Corre en el servidor (Deno, en Netlify) — la service_role key NUNCA llega
// al navegador. Cada request se re-valida contra el rol real del que llama,
// leído desde la tabla `perfiles` con su propio token (protegido por RLS).

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ROLES_ALTOS = ['Pastor de Área', 'Super Usuario'];
const ROLES_ADMIN = ['Pastor de Área', 'Líder Asesor', 'Super Usuario'];
const ROLES_VALIDOS = ['Líder de Grupo', 'Líder Asesor', 'Pastor de Área', 'Super Usuario'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function randomPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '');
  return `${b64.slice(0, 14)}!9`;
}

async function getCaller(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser(token);
  if (userErr || !userData?.user) return null;
  const { data: perfil } = await asUser
    .from('perfiles')
    .select('id,rol,nombre')
    .eq('id', userData.user.id)
    .single();
  return perfil || null;
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  const caller = await getCaller(req);
  if (!caller || !ROLES_ADMIN.includes(caller.rol)) {
    return json({ error: 'No autorizado' }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  async function audit(accion: string, entidadId: string, detalle: Record<string, unknown>) {
    await admin.from('auditoria').insert({ actor_id: caller!.id, accion, entidad: 'perfiles', entidad_id: entidadId, detalle });
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { nombre, email, password, rol, grupoId } = body;
      if (!nombre || !email || !password || !rol) {
        return json({ error: 'Nombre, correo, contraseña y rol son requeridos.' }, 400);
      }
      if (!ROLES_VALIDOS.includes(rol)) return json({ error: 'Rol inválido.' }, 400);
      if (ROLES_ALTOS.includes(rol) && !ROLES_ALTOS.includes(caller.rol)) {
        return json({ error: 'Solo Pastor de Área o Super Usuario pueden asignar ese rol.' }, 403);
      }
      if (String(password).length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const { error: perfilErr } = await admin.from('perfiles').insert({
        id: created.user.id, nombre, email, rol, grupo_id: grupoId || null,
      });
      if (perfilErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: perfilErr.message }, 400);
      }

      await audit('crear_usuario', created.user.id, { nombre, email, rol });
      return json({ id: created.user.id });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, nombre, email, rol, grupoId, generatePassword } = body;
      if (!id) return json({ error: 'Falta id.' }, 400);
      if (rol && !ROLES_VALIDOS.includes(rol)) return json({ error: 'Rol inválido.' }, 400);

      const { data: existing, error: existingErr } = await admin.from('perfiles').select('email').eq('id', id).single();
      if (existingErr || !existing) return json({ error: 'Usuario no encontrado.' }, 404);
      const emailChanged = email !== undefined && email !== existing.email;

      if (rol && ROLES_ALTOS.includes(rol) && !ROLES_ALTOS.includes(caller.rol)) {
        return json({ error: 'Solo Pastor de Área o Super Usuario pueden asignar ese rol.' }, 403);
      }
      if (generatePassword && !ROLES_ALTOS.includes(caller.rol)) {
        return json({ error: 'Solo Pastor de Área o Super Usuario pueden restablecer contraseñas.' }, 403);
      }
      if (emailChanged && !ROLES_ALTOS.includes(caller.rol)) {
        return json({ error: 'Solo Pastor de Área o Super Usuario pueden cambiar el correo.' }, 403);
      }

      const authUpdates: Record<string, unknown> = {};
      if (emailChanged) authUpdates.email = email;
      let newPassword: string | null = null;
      if (generatePassword) {
        newPassword = randomPassword();
        authUpdates.password = newPassword;
      }
      if (Object.keys(authUpdates).length) {
        const { error: authErr } = await admin.auth.admin.updateUserById(id, authUpdates);
        if (authErr) return json({ error: authErr.message }, 400);
      }

      const perfilUpdates: Record<string, unknown> = {};
      if (nombre !== undefined) perfilUpdates.nombre = nombre;
      if (email !== undefined) perfilUpdates.email = email;
      if (rol !== undefined) perfilUpdates.rol = rol;
      if (grupoId !== undefined) perfilUpdates.grupo_id = grupoId || null;
      if (Object.keys(perfilUpdates).length) {
        const { error: perfilErr } = await admin.from('perfiles').update(perfilUpdates).eq('id', id);
        if (perfilErr) return json({ error: perfilErr.message }, 400);
      }

      await audit(newPassword ? 'restablecer_clave' : 'editar_usuario', id, { nombre, email, rol, grupoId });
      return json({ ok: true, newPassword });
    }

    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;
      if (!id) return json({ error: 'Falta id.' }, 400);
      if (id === caller.id) return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400);

      const { data: target } = await admin.from('perfiles').select('rol').eq('id', id).single();
      if (target && ROLES_ALTOS.includes(target.rol)) {
        const { count } = await admin.from('perfiles').select('id', { count: 'exact', head: true }).in('rol', ROLES_ALTOS);
        if ((count ?? 0) <= 1) {
          return json({ error: 'No puedes eliminar el último Pastor de Área / Super Usuario del sistema.' }, 400);
        }
      }

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      await audit('eliminar_usuario', id, {});
      return json({ ok: true });
    }

    return json({ error: 'Método no soportado.' }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

export const config = { path: '/api/admin-users' };
