import { atFetchAll, atPost, atPatch, atDelete } from './airtable.js';

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
