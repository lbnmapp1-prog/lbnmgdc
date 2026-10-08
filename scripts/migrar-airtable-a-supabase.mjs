#!/usr/bin/env node
// Copia los datos de Airtable a Supabase. Es repetible: se puede correr varias veces
// sin duplicar (usa la columna airtable_id).
//
//   Simulacro (no escribe nada, solo valida y cuenta):
//     node scripts/migrar-airtable-a-supabase.mjs
//   Migración real:
//     node scripts/migrar-airtable-a-supabase.mjs --ejecutar
//   Migración real + correos para que cada usuario elija su contraseña:
//     node scripts/migrar-airtable-a-supabase.mjs --ejecutar --enviar-correos
//
// Variables de entorno (se ponen en tu terminal; NUNCA se guardan en el repositorio):
//   AIRTABLE_TOKEN             token de Airtable con lectura sobre la base
//   SUPABASE_URL               https://TU_PROYECTO.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  clave service_role (Settings > API) — secreta
//   APP_URL                    (opcional) dirección de la app en Vercel, para los correos
//
// Las contraseñas de Airtable NO se copian: cada usuario se crea con una clave aleatoria
// que nadie conoce y define la suya con "¿Olvidaste tu contraseña?" o con el correo.

import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const EJECUTAR = process.argv.includes('--ejecutar');
const ENVIAR_CORREOS = process.argv.includes('--enviar-correos');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_API = process.env.AIRTABLE_API_URL || 'https://api.airtable.com';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'apppQCdCQ211ydjbA';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || '';

const TABLAS = {
  grupos: 'tblCchzDiLhWuag4T', miembros: 'tblVb1G0mMIwCDPwi', eventos: 'tbl3kJkuFevmo38DV',
  usuarios: 'tblbCOwG5JN1aNVcj', seguimientos: 'tblTo1PtutoYbMq8a', clases: 'tbl22JS1OMLwY1Dcw',
  evaluaciones: 'tblwWvgxg1cD1hH3K', reuniones: 'tblYS0xcMXfTYGTqv', asistencias: 'tblmhcvb5FBVWVSIM',
};
const AREAS = { Dios: 'dios', Familia: 'familia', Relaciones: 'relaciones', Amigos: 'amigos', Salud: 'salud', Dinero: 'dinero', Profesion: 'profesion', VidaAdulta: 'vida_adulta', Ocio: 'ocio' };
const ROLES_PERFIL = ['Líder de Grupo', 'Líder Asesor', 'Pastor de Área', 'Super Usuario'];

const avisos = [];
const aviso = (tabla, id, msg) => { avisos.push({ tabla, id, msg }); };

function faltan(vars) {
  const f = vars.filter(([, v]) => !v).map(([k]) => k);
  if (f.length) { console.error(`Faltan variables de entorno: ${f.join(', ')}`); process.exit(1); }
}
faltan([['AIRTABLE_TOKEN', AIRTABLE_TOKEN]]);
if (EJECUTAR || ENVIAR_CORREOS) faltan([['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY]]);

// ---------- Airtable (solo lectura) ----------
async function leerAirtable(tabla) {
  const filas = [];
  let offset = '';
  do {
    const r = await fetch(`${AIRTABLE_API}/v0/${BASE_ID}/${TABLAS[tabla]}?pageSize=100${offset ? `&offset=${offset}` : ''}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!r.ok) throw new Error(`Airtable ${tabla}: ${r.status} ${await r.text()}`);
    const d = await r.json();
    filas.push(...d.records);
    offset = d.offset || '';
  } while (offset);
  return filas;
}

// ---------- Supabase ----------
async function sb(path, { method = 'GET', body, headers = {}, raw } = {}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(raw ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: raw ? body : (body === undefined ? undefined : JSON.stringify(body)),
  });
  const texto = await r.text();
  let data = null;
  try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
  if (!r.ok) {
    const e = new Error(`Supabase ${method} ${path}: ${r.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    e.status = r.status;
    throw e;
  }
  return data;
}

// Inserta/actualiza por lotes y devuelve el mapa airtable_id → uuid.
async function upsert(tabla, filas, conflicto = 'airtable_id') {
  const mapa = new Map();
  if (!EJECUTAR || !filas.length) return mapa;
  const claves = [...new Set(filas.flatMap(f => Object.keys(f)))];
  for (let i = 0; i < filas.length; i += 200) {
    const lote = filas.slice(i, i + 200).map(f => Object.fromEntries(claves.map(k => [k, f[k] ?? null])));
    const res = await sb(`/rest/v1/${tabla}?on_conflict=${conflicto}`, {
      method: 'POST', body: lote, headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
    res.forEach(r => { if (r.airtable_id) mapa.set(r.airtable_id, r.id); });
  }
  return mapa;
}

// ---------- limpieza de valores ----------
const texto = v => (v === undefined || v === null ? null : String(v));
function fecha(tabla, id, v) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  aviso(tabla, id, `fecha inválida "${v}" (se deja vacía)`);
  return null;
}
function nota(tabla, id, campo, v) {
  if (v === undefined || v === null) return null;
  if (Number.isInteger(v) && v >= 1 && v <= 10) return v;
  aviso(tabla, id, `${campo}=${v} fuera de 1-10 (se deja vacío)`);
  return null;
}

async function main() {
  console.log(EJECUTAR ? '== MIGRACIÓN REAL ==' : '== SIMULACRO (no se escribe nada; usa --ejecutar para migrar) ==');
  const datos = {};
  for (const t of Object.keys(TABLAS)) {
    datos[t] = await leerAirtable(t);
    console.log(`  Airtable ${t.padEnd(13)} ${datos[t].length} filas`);
  }

  // 1) GRUPOS
  const grupoMap = await upsert('grupos', datos.grupos.map(r => ({
    airtable_id: r.id, nombre: r.fields.Nombre || '(sin nombre)', sede: texto(r.fields.Sede),
  })));
  const grupoOk = id => !id || (EJECUTAR ? grupoMap.has(id) : datos.grupos.some(g => g.id === id));
  const gId = (tabla, id, v) => {
    if (!v) return null;
    if (!grupoOk(v)) { aviso(tabla, id, `GrupoId ${v} no existe (queda sin grupo)`); return null; }
    return grupoMap.get(v) || null;
  };

  // 2) USUARIOS (Supabase Auth + perfiles)
  const usuarioMap = new Map();
  const correosVistos = new Set();
  const aMigrar = [];
  for (const r of datos.usuarios) {
    const email = (r.fields.Email || '').trim().toLowerCase();
    if (!email) { aviso('usuarios', r.id, 'sin correo (no se migra)'); continue; }
    if (correosVistos.has(email)) { aviso('usuarios', r.id, `correo repetido ${email} (no se migra)`); continue; }
    correosVistos.add(email);
    const rol = r.fields.Rol;
    if (!ROLES_PERFIL.includes(rol)) { aviso('usuarios', r.id, `rol "${rol}" inválido (no se migra)`); continue; }
    aMigrar.push({ r, email, rol });
  }
  if (EJECUTAR) {
    let existentes = new Map();
    const lista = await sb('/auth/v1/admin/users?per_page=1000');
    (lista.users || []).forEach(u => existentes.set((u.email || '').toLowerCase(), u.id));
    for (const { r, email, rol } of aMigrar) {
      let id = existentes.get(email);
      if (!id) {
        const u = await sb('/auth/v1/admin/users', { method: 'POST', body: { email, password: randomBytes(24).toString('base64url'), email_confirm: true } });
        id = u.id;
      }
      usuarioMap.set(r.id, id);
      await sb('/rest/v1/perfiles?on_conflict=id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: [{ id, nombre: r.fields.Nombre || email, email, rol, grupo_id: gId('usuarios', r.id, r.fields.GrupoId) }],
      });
    }
  }
  if (!aMigrar.some(u => ['Pastor de Área', 'Super Usuario'].includes(u.rol))) {
    aviso('usuarios', '-', 'ningún usuario Pastor de Área / Super Usuario: nadie podrá administrar el sistema');
  }

  // 3) MIEMBROS
  const miembroFilas = datos.miembros.map(r => {
    const f = r.fields;
    return {
      airtable_id: r.id, nombre: f.Nombre || '(sin nombre)', rol: f.Rol || 'Miembro', grupo_id: gId('miembros', r.id, f.GrupoId),
      telefono: texto(f.Telefono), correo: texto(f.Correo), fecha_nacimiento: fecha('miembros', r.id, f.FechaNacimiento),
      estado_civil: f.EstadoCivil || 'Soltero', nro_hijos: f.NroHijos ?? 0, edades_hijos: texto(f.EdadesHijos),
      aniversario: texto(f.Aniversario), profesion: texto(f.Profesion), ocupacion: texto(f.Ocupacion),
      tiempo_iglesia: texto(f.TiempoIglesia), direccion: texto(f.Direccion), bautizado: !!f.Bautizado,
      padre_esp: texto(f.PadreEsp), disc_inicio: texto(f.DiscInicio), disc_fin: texto(f.DiscFin), dones: texto(f.Dones),
      habilidades: texto(f.Habilidades), temperamentos: f.Temperamentos || [], mentor: texto(f.Mentor), oracion: texto(f.Oracion),
      nivel_idx: f.NivelIdx ?? 0, cursos_completados: f.CursosCompletados || [], apoyo_completados: f.ApoyoCompletados || [],
      sede: texto(f.Sede),
    };
  });
  const miembroMap = await upsert('miembros', miembroFilas);
  const miembroExiste = id => (EJECUTAR ? miembroMap.has(id) : datos.miembros.some(m => m.id === id));

  // 4) EVENTOS
  await upsert('eventos', datos.eventos.flatMap(r => {
    const f = r.fields;
    const fe = fecha('eventos', r.id, f.Fecha);
    if (!fe) { aviso('eventos', r.id, 'sin fecha válida (no se migra)'); return []; }
    return [{ airtable_id: r.id, titulo: f.Titulo || '(sin título)', fecha: fe, hora: texto(f.Hora), lugar: texto(f.Lugar), tipo: f.Tipo || 'reunion' }];
  }));

  // 5) SEGUIMIENTOS
  const segMap = await upsert('seguimientos', datos.seguimientos.flatMap(r => {
    const f = r.fields;
    if (!miembroExiste(f.MiembroId)) { aviso('seguimientos', r.id, `miembro ${f.MiembroId} no existe (no se migra)`); return []; }
    return [{
      airtable_id: r.id, miembro_id: miembroMap.get(f.MiembroId) || null, miembro_nombre: texto(f.MiembroNombre),
      grupo_id: gId('seguimientos', r.id, f.GrupoId), fecha: fecha('seguimientos', r.id, f.Fecha), hora: texto(f.Hora),
      temas: texto(f.Temas), proximos_pasos: texto(f.ProximosPasos), versiculos: texto(f.Versiculos),
      estado: f.Estado || 'Programada', notas: texto(f.Notas), lider_nombre: texto(f.LiderNombre),
      area: f.Area || null, preguntas: texto(f.Preguntas), puntuacion: nota('seguimientos', r.id, 'Puntuacion', f.Puntuacion),
    }];
  }));

  // 6) EVALUACIONES
  await upsert('evaluaciones', datos.evaluaciones.flatMap(r => {
    const f = r.fields;
    if (!miembroExiste(f.MiembroId)) { aviso('evaluaciones', r.id, `miembro ${f.MiembroId} no existe (no se migra)`); return []; }
    const fila = {
      airtable_id: r.id, miembro_id: miembroMap.get(f.MiembroId) || null, miembro_nombre: texto(f.MiembroNombre),
      grupo_id: gId('evaluaciones', r.id, f.GrupoId), fecha: fecha('evaluaciones', r.id, f.Fecha) || new Date().toISOString().slice(0, 10),
      fuente: f.Fuente || 'Líder', estado: f.Estado || 'Pendiente', comentario: texto(f.Comentario), lider_nombre: texto(f.LiderNombre),
      seguimiento_id: segMap.get(f.SeguimientoId) || null,
    };
    Object.entries(AREAS).forEach(([k, col]) => { fila[col] = nota('evaluaciones', r.id, k, f[k]); });
    return [fila];
  }));

  // 7) CLASES (+ PDF al bucket privado "clases")
  let pdfs = 0;
  const claseFilas = datos.clases.map(r => {
    const f = r.fields;
    return { airtable_id: r.id, pilar: f.Pilar || '', orden: f.Orden ?? 0, titulo: f.Titulo || '(sin título)', fecha: fecha('clases', r.id, f.Fecha), hora: texto(f.Hora), descripcion: texto(f.Descripcion) };
  });
  const claseMap = await upsert('clases', claseFilas);
  for (const r of datos.clases) {
    const adj = r.fields.Archivo?.[0];
    if (!adj) continue;
    pdfs++;
    if (!EJECUTAR) continue;
    const id = claseMap.get(r.id);
    const limpio = adj.filename.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
    const path = `${id}/${limpio}`;
    const bin = await fetch(adj.url);
    if (!bin.ok) { aviso('clases', r.id, `no se pudo descargar el PDF ${adj.filename}`); continue; }
    const bytes = Buffer.from(await bin.arrayBuffer());
    await sb(`/storage/v1/object/clases/${path}`, { method: 'POST', raw: true, body: bytes, headers: { 'Content-Type': adj.type || 'application/pdf', 'x-upsert': 'true' } });
    await sb(`/rest/v1/clases?id=eq.${id}`, { method: 'PATCH', body: { archivo_path: path, archivo_nombre: adj.filename, archivo_size: adj.size || bytes.length }, headers: { Prefer: 'return=minimal' } });
  }

  // 8) REUNIONES y ASISTENCIAS
  const reunionMap = await upsert('reuniones', datos.reuniones.flatMap(r => {
    const f = r.fields;
    const fe = fecha('reuniones', r.id, f.Fecha);
    if (!fe) { aviso('reuniones', r.id, 'sin fecha válida (no se migra)'); return []; }
    return [{ airtable_id: r.id, fecha: fe, grupo_id: gId('reuniones', r.id, f.GrupoId), grupo_nombre: texto(f.GrupoNombre), tipo: texto(f.Tipo), lider_nombre: texto(f.LiderNombre), notas: texto(f.Notas) }];
  }));
  await upsert('asistencias', datos.asistencias.flatMap(r => {
    const f = r.fields;
    if (!miembroExiste(f.MiembroId)) { aviso('asistencias', r.id, `miembro ${f.MiembroId} no existe (no se migra)`); return []; }
    return [{ airtable_id: r.id, reunion_id: reunionMap.get(f.ReunionId) || null, miembro_id: miembroMap.get(f.MiembroId) || null, miembro_nombre: texto(f.MiembroNombre), grupo_id: gId('asistencias', r.id, f.GrupoId), fecha: fecha('asistencias', r.id, f.Fecha), estado: texto(f.Estado) }];
  }));

  // 9) Correos para elegir contraseña nueva
  if (EJECUTAR && ENVIAR_CORREOS) {
    console.log('\nEnviando correos de contraseña nueva (Supabase limita los envíos con su correo por defecto; configura un SMTP propio si son muchos)...');
    for (const { email } of aMigrar) {
      try {
        await sb(`/auth/v1/recover${APP_URL ? `?redirect_to=${encodeURIComponent(APP_URL)}` : ''}`, { method: 'POST', body: { email } });
        console.log(`  ✓ ${email}`);
      } catch (e) { aviso('usuarios', email, `no se pudo enviar el correo: ${e.message}`); console.log(`  ✗ ${email}`); }
    }
  }

  // ---------- resumen y verificación ----------
  console.log('\nResumen' + (EJECUTAR ? ' (conteo en Supabase vs. Airtable)' : ' (lo que se migraría)'));
  const resumen = {};
  for (const t of ['grupos', 'miembros', 'eventos', 'seguimientos', 'evaluaciones', 'clases', 'reuniones', 'asistencias']) {
    let dest = '-';
    if (EJECUTAR) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' } });
      dest = (r.headers.get('content-range') || '').split('/')[1];
    }
    resumen[t] = { airtable: datos[t].length, supabase: dest };
    console.log(`  ${t.padEnd(13)} Airtable ${String(datos[t].length).padStart(5)}   Supabase ${String(dest).padStart(5)}`);
  }
  console.log(`  usuarios      Airtable ${String(datos.usuarios.length).padStart(5)}   a migrar  ${String(aMigrar.length).padStart(5)}`);
  console.log(`  PDF de clases ${pdfs}`);

  if (avisos.length) {
    console.log(`\n⚠ ${avisos.length} aviso(s):`);
    avisos.slice(0, 40).forEach(a => console.log(`  [${a.tabla}] ${a.id}: ${a.msg}`));
    if (avisos.length > 40) console.log(`  ... y ${avisos.length - 40} más (ver migracion-informe.json)`);
  } else {
    console.log('\nSin avisos.');
  }
  writeFileSync('migracion-informe.json', JSON.stringify({ ejecutado: EJECUTAR, resumen, avisos }, null, 2));
  console.log('\nInforme guardado en migracion-informe.json (no se sube al repositorio).');
  if (!EJECUTAR) console.log('Si todo se ve bien, corre de nuevo con --ejecutar.');
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
