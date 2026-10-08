import { supabase } from './supabase.js';
import { PILARES, AREAS_RUEDA, AREA_COL } from './constants.js';

// ---- utilidades ----
function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// PostgREST devuelve como máximo 1000 filas por consulta: se pagina para traer todo.
async function selectAll(table, columns = '*', apply = q => q) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const rows = check(await apply(supabase.from(table).select(columns)).order('id').range(from, from + size - 1));
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

const vacioANull = v => (v === '' || v === undefined ? null : v);

// ---- normalizadores (misma forma que usan las pantallas) ----
function normGrupo(r) {
  return { id: r.id, nombre: r.nombre || '', sede: r.sede || '' };
}

function calcEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear();
  const noHaLlegado = (hoy.getUTCMonth() < nac.getUTCMonth()) ||
    (hoy.getUTCMonth() === nac.getUTCMonth() && hoy.getUTCDate() < nac.getUTCDate());
  if (noHaLlegado) edad--;
  return edad;
}

function normMiembro(r, gruposMap = {}) {
  const gId = r.grupo_id || '';
  return {
    id: r.id,
    nombre: r.nombre || '',
    rol: r.rol || 'Miembro',
    grupo_id: gId,
    grupos: gruposMap[gId] || null,
    telefono: r.telefono || '',
    correo: r.correo || '',
    fecha_nacimiento: r.fecha_nacimiento || null,
    edad: calcEdad(r.fecha_nacimiento),
    estado_civil: r.estado_civil || 'Soltero',
    nro_hijos: r.nro_hijos ?? 0,
    edades_hijos: r.edades_hijos || '',
    aniversario: r.aniversario || '',
    profesion: r.profesion || '',
    ocupacion: r.ocupacion || '',
    tiempo_iglesia: r.tiempo_iglesia || '',
    direccion: r.direccion || '',
    bautizado: r.bautizado || false,
    padre_esp: r.padre_esp || '',
    disc_inicio: r.disc_inicio || '',
    disc_fin: r.disc_fin || '',
    dones: r.dones || '',
    habilidades: r.habilidades || '',
    temperamentos: r.temperamentos || [],
    mentor: r.mentor || '',
    oracion: r.oracion || '',
    nivel_idx: r.nivel_idx ?? 0,
    cursos_completados: r.cursos_completados || [],
    apoyo_completados: r.apoyo_completados || [],
    sede: r.sede || '',
  };
}

function normEvento(r) {
  return { id: r.id, titulo: r.titulo || '', fecha: r.fecha || '', hora: r.hora || '', lugar: r.lugar || '', tipo: r.tipo || 'reunion' };
}

// ---- cache de grupos (se pide una vez por sesión) ----
let _gruposCache = null;
async function gruposMap() {
  if (!_gruposCache) {
    const rows = await selectAll('grupos');
    _gruposCache = {};
    rows.forEach(r => { _gruposCache[r.id] = normGrupo(r); });
  }
  return _gruposCache;
}
export function invalidateGruposCache() { _gruposCache = null; }

// ===== GRUPOS =====
export async function getGrupos() {
  const map = await gruposMap();
  return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function createGrupo(nombre, sede) {
  invalidateGruposCache();
  return normGrupo(check(await supabase.from('grupos').insert({ nombre, sede }).select().single()));
}

export async function updateGrupo(id, nombre, sede) {
  invalidateGruposCache();
  return normGrupo(check(await supabase.from('grupos').update({ nombre, sede }).eq('id', id).select().single()));
}

export async function deleteGrupo(id) {
  invalidateGruposCache();
  check(await supabase.from('grupos').delete().eq('id', id));
}

// ===== MIEMBROS =====
export async function getMiembros(grupoId = null, search = '') {
  const [rows, gMap] = await Promise.all([
    selectAll('miembros', '*', q => (grupoId ? q.eq('grupo_id', grupoId) : q)),
    gruposMap(),
  ]);
  let list = rows.map(r => normMiembro(r, gMap));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(m => m.nombre.toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getMiembro(id) {
  const gMap = await gruposMap();
  const row = check(await supabase.from('miembros').select('*').eq('id', id).maybeSingle());
  if (!row) throw new Error('Miembro no encontrado');
  return normMiembro(row, gMap);
}

function parseDate(val) {
  if (!val) return null;
  // Convierte DD/MM/AAAA → YYYY-MM-DD
  const ddmm = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`;
  return val; // ya en formato ISO
}

function toMiembroRow(f) {
  return {
    nombre: f.nombre || '',
    rol: f.rol || 'Miembro',
    grupo_id: vacioANull(f.grupo_id),
    telefono: f.telefono || '',
    correo: f.correo || '',
    fecha_nacimiento: parseDate(f.fecha_nacimiento),
    estado_civil: f.estado_civil || 'Soltero',
    nro_hijos: f.nro_hijos ?? 0,
    edades_hijos: f.edades_hijos || '',
    aniversario: f.aniversario || '',
    profesion: f.profesion || '',
    ocupacion: f.ocupacion || '',
    tiempo_iglesia: f.tiempo_iglesia || '',
    direccion: f.direccion || '',
    bautizado: !!f.bautizado,
    padre_esp: f.padre_esp || '',
    disc_inicio: f.disc_inicio || '',
    disc_fin: f.disc_fin || '',
    dones: f.dones || '',
    habilidades: f.habilidades || '',
    temperamentos: f.temperamentos || [],
    mentor: f.mentor || '',
    oracion: f.oracion || '',
    nivel_idx: f.nivel_idx ?? 0,
    cursos_completados: f.cursos_completados || [],
    apoyo_completados: f.apoyo_completados || [],
    sede: f.sede || '',
  };
}

export async function createMiembro(fields) {
  const gMap = await gruposMap();
  return normMiembro(check(await supabase.from('miembros').insert(toMiembroRow(fields)).select().single()), gMap);
}

export async function updateMiembro(id, fields) {
  const gMap = await gruposMap();
  return normMiembro(check(await supabase.from('miembros').update(toMiembroRow(fields)).eq('id', id).select().single()), gMap);
}

export async function deleteMiembro(id) {
  check(await supabase.from('miembros').delete().eq('id', id));
}

// ===== EVENTOS =====
export async function getEventos(year, month) {
  const desde = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const hasta = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10);
  const rows = await selectAll('eventos', '*', q => q.gte('fecha', desde).lt('fecha', hasta));
  return rows.map(normEvento).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function toEventoRow(f) {
  return { titulo: f.titulo || '', fecha: f.fecha || null, hora: f.hora || '', lugar: f.lugar || '', tipo: f.tipo || 'reunion' };
}

export async function createEvento(fields) {
  return normEvento(check(await supabase.from('eventos').insert(toEventoRow(fields)).select().single()));
}

export async function updateEvento(id, fields) {
  return normEvento(check(await supabase.from('eventos').update(toEventoRow(fields)).eq('id', id).select().single()));
}

export async function deleteEvento(id) {
  check(await supabase.from('eventos').delete().eq('id', id));
}

// ===== STATS =====
// grupoId opcional: si se pasa, las estadísticas quedan limitadas a ese grupo
// (así un Líder de Grupo nunca ve totales que delaten el tamaño de otros grupos).
export async function getStats(grupoId = null) {
  const contar = (q) => q.then(({ count, error }) => { if (error) throw new Error(error.message); return count ?? 0; });
  const miembros = () => { const q = supabase.from('miembros').select('id', { count: 'exact', head: true }); return grupoId ? q.eq('grupo_id', grupoId) : q; };
  const [total, bautizados, grupos] = await Promise.all([
    contar(miembros()),
    contar(miembros().eq('bautizado', true)),
    grupoId ? Promise.resolve(1) : contar(supabase.from('grupos').select('id', { count: 'exact', head: true })),
  ]);
  return { total, grupos, bautizados };
}

export async function getMiembrosPorGrupo(grupoId = null) {
  const [rows, gMap] = await Promise.all([
    selectAll('miembros', 'id,grupo_id', q => (grupoId ? q.eq('grupo_id', grupoId) : q)),
    gruposMap(),
  ]);
  const map = {};
  rows.forEach(r => {
    const gId = r.grupo_id || '';
    if (!map[gId]) map[gId] = { grupo_id: gId, nombre: gMap[gId]?.nombre || '—', sede: gMap[gId]?.sede || '', count: 0 };
    map[gId].count++;
  });
  return Object.values(map);
}

export async function getCumpleaniosMes(month, grupoId = null) {
  const miembros = await getMiembros(grupoId);
  return miembros
    .filter(m => m.fecha_nacimiento && new Date(m.fecha_nacimiento).getUTCMonth() === month)
    .sort((a, b) => new Date(a.fecha_nacimiento).getUTCDate() - new Date(b.fecha_nacimiento).getUTCDate());
}

// ===== SEGUIMIENTOS (planificador de citas de discipulado) =====
function normSeguimiento(r) {
  return {
    id: r.id,
    miembro_id: r.miembro_id || '',
    miembro_nombre: r.miembro_nombre || '',
    grupo_id: r.grupo_id || '',
    fecha: r.fecha || '',
    hora: r.hora || '',
    temas: r.temas || '',
    proximos_pasos: r.proximos_pasos || '',
    versiculos: r.versiculos || '',
    estado: r.estado || 'Programada',
    notas: r.notas || '',
    lider_nombre: r.lider_nombre || '',
    area: r.area || '',
    preguntas: r.preguntas || '',
    puntuacion: typeof r.puntuacion === 'number' ? r.puntuacion : null,
  };
}

export async function getSeguimientos(grupoId = null) {
  const rows = await selectAll('seguimientos', '*', q => (grupoId ? q.eq('grupo_id', grupoId) : q));
  return rows.map(normSeguimiento)
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
}

export async function createSeguimiento(f) {
  return normSeguimiento(check(await supabase.from('seguimientos').insert({
    miembro_id: f.miembro_id,
    miembro_nombre: f.miembro_nombre || '',
    grupo_id: vacioANull(f.grupo_id),
    fecha: vacioANull(f.fecha),
    hora: f.hora || '',
    temas: f.temas || '',
    proximos_pasos: f.proximos_pasos || '',
    versiculos: f.versiculos || '',
    estado: f.estado || 'Programada',
    notas: f.notas || '',
    lider_nombre: f.lider_nombre || '',
    area: vacioANull(f.area),
    preguntas: f.preguntas || '',
  }).select().single()));
}

export async function updateSeguimiento(id, f) {
  const patch = {};
  ['fecha', 'hora', 'temas', 'proximos_pasos', 'versiculos', 'estado', 'notas', 'preguntas', 'puntuacion'].forEach(k => {
    if (f[k] !== undefined) patch[k] = k === 'fecha' ? vacioANull(f[k]) : f[k];
  });
  if (f.area !== undefined) patch.area = vacioANull(f.area);
  return normSeguimiento(check(await supabase.from('seguimientos').update(patch).eq('id', id).select().single()));
}

export async function deleteSeguimiento(id) {
  check(await supabase.from('seguimientos').delete().eq('id', id));
}

// ===== EVALUACIONES (rueda de vida) =====
function normEvaluacion(r) {
  const valores = {};
  AREAS_RUEDA.forEach(a => { valores[a.key] = typeof r[AREA_COL[a.key]] === 'number' ? r[AREA_COL[a.key]] : null; });
  return {
    id: r.id,
    miembro_id: r.miembro_id || '',
    miembro_nombre: r.miembro_nombre || '',
    grupo_id: r.grupo_id || '',
    fecha: r.fecha || '',
    fuente: r.fuente || 'Líder',
    estado: r.estado || 'Pendiente',
    valores,
    comentario: r.comentario || '',
    lider_nombre: r.lider_nombre || '',
    seguimiento_id: r.seguimiento_id || '',
  };
}

export async function getEvaluaciones(grupoId = null, miembroId = null) {
  const rows = await selectAll('evaluaciones', '*', q => {
    if (grupoId) q = q.eq('grupo_id', grupoId);
    if (miembroId) q = q.eq('miembro_id', miembroId);
    return q;
  });
  return rows.map(normEvaluacion).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function createEvaluacion(f) {
  const row = {
    miembro_id: f.miembro_id,
    miembro_nombre: f.miembro_nombre || '',
    grupo_id: vacioANull(f.grupo_id),
    fecha: f.fecha,
    fuente: f.fuente || 'Líder',
    estado: f.estado || 'Aprobada',
    comentario: f.comentario || '',
    lider_nombre: f.lider_nombre || '',
    seguimiento_id: vacioANull(f.seguimiento_id),
  };
  AREAS_RUEDA.forEach(a => { if (f.valores?.[a.key] != null) row[AREA_COL[a.key]] = f.valores[a.key]; });
  return normEvaluacion(check(await supabase.from('evaluaciones').insert(row).select().single()));
}

export async function updateEvaluacion(id, f) {
  const patch = {};
  if (f.estado !== undefined) patch.estado = f.estado;
  return normEvaluacion(check(await supabase.from('evaluaciones').update(patch).eq('id', id).select().single()));
}

export async function deleteEvaluacion(id) {
  check(await supabase.from('evaluaciones').delete().eq('id', id));
}

// ===== CLASES (Organizador de Temas: 5 pilares x 5 clases) =====
const BUCKET = 'clases';
const URL_VIGENCIA_SEG = 3600;

function normClase(r, urls = {}) {
  const adj = r.archivo_path && urls[r.archivo_path]
    ? { url: urls[r.archivo_path], filename: r.archivo_nombre || 'archivo.pdf', size: r.archivo_size || 0 }
    : null;
  return {
    id: r.id,
    pilar: r.pilar || '',
    orden: r.orden ?? 0,
    titulo: r.titulo || '',
    fecha: r.fecha || '',
    hora: r.hora || '',
    descripcion: r.descripcion || '',
    archivo: adj,
  };
}

// Los PDF están en un bucket privado: se leen con URLs firmadas de corta vigencia.
async function firmarUrls(rows) {
  const paths = rows.map(r => r.archivo_path).filter(Boolean);
  if (!paths.length) return {};
  const data = check(await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_VIGENCIA_SEG));
  return Object.fromEntries(data.filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]));
}

export async function getClases() {
  const rows = await selectAll('clases');
  const urls = await firmarUrls(rows);
  return rows.map(r => normClase(r, urls)).sort((a, b) =>
    PILARES.findIndex(p => p.nombre === a.pilar) - PILARES.findIndex(p => p.nombre === b.pilar) || a.orden - b.orden
  );
}

export async function getClasesDelMes(year, month) {
  const clases = await getClases();
  const m = String(month + 1).padStart(2, '0');
  return clases.filter(c => c.fecha && c.fecha.startsWith(`${year}-${m}`));
}

export async function createClase(f) {
  const row = check(await supabase.from('clases').insert({
    pilar: f.pilar || '',
    orden: f.orden ?? 0,
    titulo: f.titulo || '',
    fecha: vacioANull(f.fecha),
    hora: f.hora || '',
    descripcion: f.descripcion || '',
  }).select().single());
  return normClase(row);
}

export async function updateClase(id, f) {
  const patch = {};
  if (f.titulo !== undefined) patch.titulo = f.titulo;
  if (f.fecha !== undefined) patch.fecha = vacioANull(f.fecha);
  if (f.hora !== undefined) patch.hora = f.hora;
  if (f.descripcion !== undefined) patch.descripcion = f.descripcion;
  const row = check(await supabase.from('clases').update(patch).eq('id', id).select().single());
  return normClase(row, await firmarUrls([row]));
}

export async function deleteClase(id) {
  const row = check(await supabase.from('clases').select('archivo_path').eq('id', id).maybeSingle());
  check(await supabase.from('clases').delete().eq('id', id));
  if (row?.archivo_path) await supabase.storage.from(BUCKET).remove([row.archivo_path]);
}

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function subirArchivoClase(claseId, file) {
  if (file.size > MAX_PDF_BYTES) throw new Error('El archivo es muy grande (máximo 20MB).');
  const previo = check(await supabase.from('clases').select('archivo_path').eq('id', claseId).maybeSingle());
  const limpio = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
  const path = `${claseId}/${Date.now()}-${limpio}`;
  check(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/pdf' }));
  const row = check(await supabase.from('clases')
    .update({ archivo_path: path, archivo_nombre: file.name, archivo_size: file.size })
    .eq('id', claseId).select().single());
  if (previo?.archivo_path) await supabase.storage.from(BUCKET).remove([previo.archivo_path]);
  return normClase(row, await firmarUrls([row]));
}
