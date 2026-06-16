import { atFetchAll, atPost, atPatch, atDelete } from './airtable.js';

// ---- normalizadores ----
function normGrupo(rec) {
  return { id: rec.id, nombre: rec.fields.Nombre || '', sede: rec.fields.Sede || '' };
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
    estado_civil: f.EstadoCivil || 'Soltero',
    profesion: f.Profesion || '',
    tiempo_iglesia: f.TiempoIglesia || '',
    direccion: f.Direccion || '',
    bautizado: f.Bautizado || false,
    padre_esp: f.PadreEsp || '',
    disc_inicio: f.DiscInicio || '',
    dones: f.Dones || '',
    habilidades: f.Habilidades || '',
    temperamentos: f.Temperamentos || [],
    mentor: f.Mentor || '',
    oracion: f.Oracion || '',
    nivel_idx: f.NivelIdx ?? 0,
  };
}

function normEvento(rec) {
  const f = rec.fields;
  return { id: rec.id, titulo: f.Titulo || '', fecha: f.Fecha || '', hora: f.Hora || '', lugar: f.Lugar || '', tipo: f.Tipo || 'reunion' };
}

// ---- cache de grupos (evita refetch en cada llamada) ----
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
    Profesion: fields.profesion || '',
    TiempoIglesia: fields.tiempo_iglesia || '',
    Direccion: fields.direccion || '',
    Bautizado: !!fields.bautizado,
    PadreEsp: fields.padre_esp || '',
    DiscInicio: fields.disc_inicio || '',
    Dones: fields.dones || '',
    Habilidades: fields.habilidades || '',
    Temperamentos: fields.temperamentos || [],
    Mentor: fields.mentor || '',
    Oracion: fields.oracion || '',
    NivelIdx: fields.nivel_idx ?? 0,
  };
}

export async function createMiembro(fields) {
  // Enrich Grupo text field from cache
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

export async function deleteEvento(id) {
  await atDelete('eventos', id);
}

// ===== STATS =====
export async function getStats() {
  const [miembros, grupos] = await Promise.all([atFetchAll('miembros'), atFetchAll('grupos')]);
  const total = miembros.length;
  const bautizados = miembros.filter(r => r.fields.Bautizado).length;
  return { total, grupos: grupos.length, bautizados };
}

export async function getMiembrosPorGrupo() {
  const [miembros, gMap] = await Promise.all([atFetchAll('miembros'), gruposMap()]);
  const map = {};
  miembros.forEach(r => {
    const gId = r.fields.GrupoId || '';
    if (!map[gId]) map[gId] = { grupo_id: gId, nombre: gMap[gId]?.nombre || '—', sede: gMap[gId]?.sede || '', count: 0 };
    map[gId].count++;
  });
  return Object.values(map);
}

export async function getCumpleaniosMes(month) {
  const [recs, gMap] = await Promise.all([atFetchAll('miembros'), gruposMap()]);
  return recs
    .map(r => normMiembro(r, gMap))
    .filter(m => {
      if (!m.fecha_nacimiento) return false;
      return new Date(m.fecha_nacimiento).getUTCMonth() === month;
    });
}
