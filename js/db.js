import { atFetchAll, atPost, atPatch, atDelete, atUploadAttachment } from './airtable.js';
import { PILARES, AREAS_RUEDA } from './constants.js';

// ---- normalizadores ----
function normGrupo(rec) {
  return { id: rec.id, nombre: rec.fields.Nombre || '', sede: rec.fields.Sede || '', _raw: rec };
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

function normMiembro(rec, gruposMap = {}) {
  const f = rec.fields;
  const gId = f.GrupoId || '';
  return {
    id: rec.id,
    nombre: f.Nombre || '',
    rol: f.Rol || 'Miembro',
    grupo_id: gId,
    grupos: gruposMap[gId] || null,
    telefono: f.Telefono || '',
    correo: f.Correo || '',
    fecha_nacimiento: f.FechaNacimiento || null,
    edad: calcEdad(f.FechaNacimiento),
    estado_civil: f.EstadoCivil || 'Soltero',
    nro_hijos: f.NroHijos ?? 0,
    edades_hijos: f.EdadesHijos || '',
    aniversario: f.Aniversario || '',
    profesion: f.Profesion || '',
    ocupacion: f.Ocupacion || '',
    tiempo_iglesia: f.TiempoIglesia || '',
    direccion: f.Direccion || '',
    bautizado: f.Bautizado || false,
    padre_esp: f.PadreEsp || '',
    disc_inicio: f.DiscInicio || '',
    disc_fin: f.DiscFin || '',
    dones: f.Dones || '',
    habilidades: f.Habilidades || '',
    temperamentos: f.Temperamentos || [],
    mentor: f.Mentor || '',
    oracion: f.Oracion || '',
    nivel_idx: f.NivelIdx ?? 0,
    cursos_completados: f.CursosCompletados || [],
    apoyo_completados: f.ApoyoCompletados || [],
    sede: f.Sede || '',
  };
}

function normEvento(rec) {
  const f = rec.fields;
  return { id: rec.id, titulo: f.Titulo || '', fecha: f.Fecha || '', hora: f.Hora || '', lugar: f.Lugar || '', tipo: f.Tipo || 'reunion' };
}

// ---- cache de grupos (evita refetch en cada llamada, útil con ~50 miembros y límite de tasa de Airtable) ----
let _gruposCache = null;
async function gruposMap() {
  if (!_gruposCache) {
    const recs = await atFetchAll('grupos');
    _gruposCache = {};
    recs.forEach(r => { _gruposCache[r.id] = normGrupo(r); });
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
  const res = await atPost('grupos', { records: [{ fields: { Nombre: nombre, Sede: sede } }] });
  return normGrupo(res.records[0]);
}

export async function updateGrupo(id, nombre, sede) {
  invalidateGruposCache();
  const res = await atPatch('grupos', id, { Nombre: nombre, Sede: sede });
  return normGrupo(res);
}

export async function deleteGrupo(id) {
  invalidateGruposCache();
  await atDelete('grupos', id);
}

// ===== MIEMBROS =====
export async function getMiembros(grupoId = null, search = '') {
  const [recs, gMap] = await Promise.all([atFetchAll('miembros'), gruposMap()]);
  let list = recs.map(r => normMiembro(r, gMap));
  if (grupoId) list = list.filter(m => m.grupo_id === grupoId);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(m => m.nombre.toLowerCase().includes(q));
  }
  return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getMiembro(id) {
  const gMap = await gruposMap();
  const recs = await atFetchAll('miembros');
  const rec = recs.find(r => r.id === id);
  if (!rec) throw new Error('Miembro no encontrado');
  return normMiembro(rec, gMap);
}

function parseDate(val) {
  if (!val) return null;
  // Convierte DD/MM/AAAA → YYYY-MM-DD
  const ddmm = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2,'0')}-${ddmm[1].padStart(2,'0')}`;
  return val; // ya en formato ISO
}

function toAirtableFields(fields) {
  return {
    Nombre: fields.nombre || '',
    Rol: fields.rol || 'Miembro',
    GrupoId: fields.grupo_id || '',
    Telefono: fields.telefono || '',
    Correo: fields.correo || '',
    FechaNacimiento: parseDate(fields.fecha_nacimiento),
    EstadoCivil: fields.estado_civil || 'Soltero',
    NroHijos: fields.nro_hijos ?? 0,
    EdadesHijos: fields.edades_hijos || '',
    Aniversario: fields.aniversario || '',
    Profesion: fields.profesion || '',
    Ocupacion: fields.ocupacion || '',
    TiempoIglesia: fields.tiempo_iglesia || '',
    Direccion: fields.direccion || '',
    Bautizado: !!fields.bautizado,
    PadreEsp: fields.padre_esp || '',
    DiscInicio: fields.disc_inicio || '',
    DiscFin: fields.disc_fin || '',
    Dones: fields.dones || '',
    Habilidades: fields.habilidades || '',
    Temperamentos: fields.temperamentos || [],
    Mentor: fields.mentor || '',
    Oracion: fields.oracion || '',
    NivelIdx: fields.nivel_idx ?? 0,
    CursosCompletados: fields.cursos_completados || [],
    ApoyoCompletados: fields.apoyo_completados || [],
    Sede: fields.sede || '',
  };
}

export async function createMiembro(fields) {
  const gMap = await gruposMap();
  const atFields = toAirtableFields(fields);
  const g = gMap[fields.grupo_id];
  if (g) atFields.Grupo = g.nombre;
  const res = await atPost('miembros', { records: [{ fields: atFields }] });
  return normMiembro(res.records[0], gMap);
}

export async function updateMiembro(id, fields) {
  const gMap = await gruposMap();
  const atFields = toAirtableFields(fields);
  const g = gMap[fields.grupo_id];
  if (g) atFields.Grupo = g.nombre;
  const res = await atPatch('miembros', id, atFields);
  return normMiembro(res, gMap);
}

export async function deleteMiembro(id) {
  await atDelete('miembros', id);
}

// ===== EVENTOS =====
export async function getEventos(year, month) {
  const recs = await atFetchAll('eventos');
  const m = String(month + 1).padStart(2, '0');
  return recs
    .map(normEvento)
    .filter(e => e.fecha && e.fecha.startsWith(`${year}-${m}`))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function createEvento(fields) {
  const res = await atPost('eventos', {
    records: [{ fields: {
      Titulo: fields.titulo || '',
      Fecha: fields.fecha || '',
      Hora: fields.hora || '',
      Lugar: fields.lugar || '',
      Tipo: fields.tipo || 'reunion',
    }}],
  });
  return normEvento(res.records[0]);
}

export async function updateEvento(id, fields) {
  const res = await atPatch('eventos', id, {
    Titulo: fields.titulo || '',
    Fecha: fields.fecha || '',
    Hora: fields.hora || '',
    Lugar: fields.lugar || '',
    Tipo: fields.tipo || 'reunion',
  });
  return normEvento(res);
}

export async function deleteEvento(id) {
  await atDelete('eventos', id);
}

// ===== STATS =====
// grupoId opcional: si se pasa, las estadísticas quedan limitadas a ese grupo
// (así un Líder de Grupo nunca ve totales que delaten el tamaño de otros grupos).
export async function getStats(grupoId = null) {
  const [miembrosRecs, grupos] = await Promise.all([atFetchAll('miembros'), atFetchAll('grupos')]);
  const miembros = grupoId ? miembrosRecs.filter(r => r.fields.GrupoId === grupoId) : miembrosRecs;
  const total = miembros.length;
  const bautizados = miembros.filter(r => r.fields.Bautizado).length;
  return { total, grupos: grupoId ? 1 : grupos.length, bautizados };
}

export async function getMiembrosPorGrupo(grupoId = null) {
  const [miembrosRecs, gMap] = await Promise.all([atFetchAll('miembros'), gruposMap()]);
  const miembros = grupoId ? miembrosRecs.filter(r => r.fields.GrupoId === grupoId) : miembrosRecs;
  const map = {};
  miembros.forEach(r => {
    const gId = r.fields.GrupoId || '';
    if (!map[gId]) map[gId] = { grupo_id: gId, nombre: gMap[gId]?.nombre || '—', sede: gMap[gId]?.sede || '', count: 0 };
    map[gId].count++;
  });
  return Object.values(map);
}

export async function getCumpleaniosMes(month, grupoId = null) {
  const [recs, gMap] = await Promise.all([atFetchAll('miembros'), gruposMap()]);
  let list = recs
    .map(r => normMiembro(r, gMap))
    .filter(m => {
      if (!m.fecha_nacimiento) return false;
      return new Date(m.fecha_nacimiento).getUTCMonth() === month;
    });
  if (grupoId) list = list.filter(m => m.grupo_id === grupoId);
  return list.sort((a, b) => new Date(a.fecha_nacimiento).getUTCDate() - new Date(b.fecha_nacimiento).getUTCDate());
}

// ===== SEGUIMIENTOS (planificador de citas de discipulado) =====
function normSeguimiento(rec) {
  const f = rec.fields;
  return {
    id: rec.id,
    miembro_id: f.MiembroId || '',
    miembro_nombre: f.MiembroNombre || '',
    grupo_id: f.GrupoId || '',
    fecha: f.Fecha || '',
    hora: f.Hora || '',
    temas: f.Temas || '',
    proximos_pasos: f.ProximosPasos || '',
    versiculos: f.Versiculos || '',
    estado: f.Estado || 'Programada',
    notas: f.Notas || '',
    lider_nombre: f.LiderNombre || '',
    area: f.Area || '',
    preguntas: f.Preguntas || '',
    puntuacion: typeof f.Puntuacion === 'number' ? f.Puntuacion : null,
  };
}

export async function getSeguimientos(grupoId = null) {
  const recs = await atFetchAll('seguimientos');
  let list = recs.map(normSeguimiento);
  if (grupoId) list = list.filter(s => s.grupo_id === grupoId);
  return list.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
}

export async function createSeguimiento(fields) {
  const res = await atPost('seguimientos', { records: [{ fields: {
    MiembroId: fields.miembro_id || '',
    MiembroNombre: fields.miembro_nombre || '',
    GrupoId: fields.grupo_id || '',
    Fecha: fields.fecha || '',
    Hora: fields.hora || '',
    Temas: fields.temas || '',
    ProximosPasos: fields.proximos_pasos || '',
    Versiculos: fields.versiculos || '',
    Estado: fields.estado || 'Programada',
    Notas: fields.notas || '',
    LiderNombre: fields.lider_nombre || '',
    ...(fields.area ? { Area: fields.area } : {}),
    Preguntas: fields.preguntas || '',
  }}]});
  return normSeguimiento(res.records[0]);
}

export async function updateSeguimiento(id, fields) {
  const patch = {};
  if (fields.fecha !== undefined) patch.Fecha = fields.fecha;
  if (fields.hora !== undefined) patch.Hora = fields.hora;
  if (fields.temas !== undefined) patch.Temas = fields.temas;
  if (fields.proximos_pasos !== undefined) patch.ProximosPasos = fields.proximos_pasos;
  if (fields.versiculos !== undefined) patch.Versiculos = fields.versiculos;
  if (fields.estado !== undefined) patch.Estado = fields.estado;
  if (fields.notas !== undefined) patch.Notas = fields.notas;
  if (fields.area !== undefined) patch.Area = fields.area || null;
  if (fields.preguntas !== undefined) patch.Preguntas = fields.preguntas;
  if (fields.puntuacion !== undefined) patch.Puntuacion = fields.puntuacion;
  const res = await atPatch('seguimientos', id, patch);
  return normSeguimiento(res);
}

export async function deleteSeguimiento(id) {
  await atDelete('seguimientos', id);
}

// ===== EVALUACIONES (rueda de vida) =====
function normEvaluacion(rec) {
  const f = rec.fields;
  const valores = {};
  AREAS_RUEDA.forEach(a => { valores[a.key] = typeof f[a.key] === 'number' ? f[a.key] : null; });
  return {
    id: rec.id,
    miembro_id: f.MiembroId || '',
    miembro_nombre: f.MiembroNombre || '',
    grupo_id: f.GrupoId || '',
    fecha: f.Fecha || '',
    fuente: f.Fuente || 'Líder',
    estado: f.Estado || 'Pendiente',
    valores,
    comentario: f.Comentario || '',
    lider_nombre: f.LiderNombre || '',
    seguimiento_id: f.SeguimientoId || '',
  };
}

export async function getEvaluaciones(grupoId = null, miembroId = null) {
  const recs = await atFetchAll('evaluaciones');
  let list = recs.map(normEvaluacion);
  if (grupoId) list = list.filter(e => e.grupo_id === grupoId);
  if (miembroId) list = list.filter(e => e.miembro_id === miembroId);
  return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function createEvaluacion(fields) {
  const f = {
    MiembroId: fields.miembro_id || '',
    MiembroNombre: fields.miembro_nombre || '',
    GrupoId: fields.grupo_id || '',
    Fecha: fields.fecha || '',
    Fuente: fields.fuente || 'Líder',
    Estado: fields.estado || 'Aprobada',
    Comentario: fields.comentario || '',
    LiderNombre: fields.lider_nombre || '',
    SeguimientoId: fields.seguimiento_id || '',
  };
  AREAS_RUEDA.forEach(a => { if (fields.valores?.[a.key] != null) f[a.key] = fields.valores[a.key]; });
  const res = await atPost('evaluaciones', { records: [{ fields: f }] });
  return normEvaluacion(res.records[0]);
}

export async function updateEvaluacion(id, fields) {
  const patch = {};
  if (fields.estado !== undefined) patch.Estado = fields.estado;
  const res = await atPatch('evaluaciones', id, patch);
  return normEvaluacion(res);
}

export async function deleteEvaluacion(id) {
  await atDelete('evaluaciones', id);
}

// ===== CLASES (Organizador de Temas: 5 pilares x 5 clases) =====
function normClase(rec) {
  const f = rec.fields;
  const adj = (f.Archivo && f.Archivo[0]) ? { url: f.Archivo[0].url, filename: f.Archivo[0].filename, size: f.Archivo[0].size } : null;
  return {
    id: rec.id,
    pilar: f.Pilar || '',
    orden: f.Orden ?? 0,
    titulo: f.Titulo || '',
    fecha: f.Fecha || '',
    hora: f.Hora || '',
    descripcion: f.Descripcion || '',
    archivo: adj,
  };
}

export async function getClases() {
  const recs = await atFetchAll('clases');
  return recs.map(normClase).sort((a, b) =>
    PILARES.findIndex(p => p.nombre === a.pilar) - PILARES.findIndex(p => p.nombre === b.pilar) || a.orden - b.orden
  );
}

export async function getClasesDelMes(year, month) {
  const clases = await getClases();
  const m = String(month + 1).padStart(2, '0');
  return clases.filter(c => c.fecha && c.fecha.startsWith(`${year}-${m}`));
}

export async function createClase(fields) {
  const res = await atPost('clases', { records: [{ fields: {
    Pilar: fields.pilar || '',
    Orden: fields.orden ?? 0,
    Titulo: fields.titulo || '',
    Fecha: fields.fecha || '',
    Hora: fields.hora || '',
    Descripcion: fields.descripcion || '',
  }}]});
  return normClase(res.records[0]);
}

export async function updateClase(id, fields) {
  const patch = {};
  if (fields.titulo !== undefined) patch.Titulo = fields.titulo;
  if (fields.fecha !== undefined) patch.Fecha = fields.fecha;
  if (fields.hora !== undefined) patch.Hora = fields.hora;
  if (fields.descripcion !== undefined) patch.Descripcion = fields.descripcion;
  const res = await atPatch('clases', id, patch);
  return normClase(res);
}

export async function deleteClase(id) {
  await atDelete('clases', id);
}

const MAX_PDF_BYTES = 5 * 1024 * 1024; // límite práctico de subida directa (base64) de Airtable

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export async function subirArchivoClase(claseId, file) {
  if (file.size > MAX_PDF_BYTES) throw new Error('El archivo es muy grande (máximo 5MB).');
  const base64 = await fileToBase64(file);
  const result = await atUploadAttachment(claseId, 'Archivo', base64, file.name, file.type || 'application/pdf');
  return normClase({ id: claseId, fields: result.fields });
}
