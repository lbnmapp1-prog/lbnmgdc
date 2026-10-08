// Endpoint público para que un miembro llene su autoevaluación (rueda de vida) sin cuenta.
// Nunca escribe como "Aprobada": todo entra como "Pendiente" hasta que el líder la apruebe.
// Requiere la variable de entorno AIRTABLE_TOKEN en Netlify (token con acceso a esta base).

const BASE_ID = 'apppQCdCQ211ydjbA';
const T_MIEMBROS = 'tblVb1G0mMIwCDPwi';
const T_EVAL = 'tblwWvgxg1cD1hH3K';
const AREAS = ['Dios', 'Familia', 'Relaciones', 'Amigos', 'Salud', 'Dinero', 'Profesion', 'VidaAdulta', 'Ocio'];
const MAX_PENDIENTES = 3;

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

async function at(path, opts = {}) {
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`airtable ${r.status}`);
  return r.json();
}

async function getMiembro(id) {
  try { return await at(`${T_MIEMBROS}/${id}`); } catch { return null; }
}

exports.handler = async (event) => {
  if (!process.env.AIRTABLE_TOKEN) return json(500, { error: 'Servicio no configurado.' });

  try {
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.m || '';
      if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return json(400, { error: 'Enlace inválido.' });
      const m = await getMiembro(id);
      if (!m) return json(404, { error: 'Enlace inválido.' });
      return json(200, { nombre: (m.fields.Nombre || '').split(' ')[0] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Solicitud inválida.' }); }
      const id = String(body.m || '');
      if (!/^rec[A-Za-z0-9]{14}$/.test(id)) return json(400, { error: 'Enlace inválido.' });

      const fields = {};
      for (const k of AREAS) {
        const v = body.valores?.[k];
        if (!Number.isInteger(v) || v < 1 || v > 10) return json(400, { error: 'Responde todas las áreas con un número del 1 al 10.' });
        fields[k] = v;
      }

      const m = await getMiembro(id);
      if (!m) return json(404, { error: 'Enlace inválido.' });

      const formula = encodeURIComponent(`AND({MiembroId}='${id}',{Estado}='Pendiente')`);
      const pend = await at(`${T_EVAL}?filterByFormula=${formula}&fields%5B%5D=Estado`);
      if (pend.records.length >= MAX_PENDIENTES) {
        return json(429, { error: 'Ya enviaste tu evaluación. Espera a que tu líder la revise.' });
      }

      await at(T_EVAL, {
        method: 'POST',
        body: JSON.stringify({
          typecast: true,
          records: [{ fields: {
            ...fields,
            MiembroId: id,
            MiembroNombre: m.fields.Nombre || '',
            GrupoId: m.fields.GrupoId || '',
            Fecha: new Date().toISOString().slice(0, 10),
            Fuente: 'Autoevaluación',
            Estado: 'Pendiente',
            Comentario: String(body.comentario || '').slice(0, 1000),
          } }],
        }),
      });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Método no permitido.' });
  } catch {
    return json(500, { error: 'No se pudo procesar la solicitud. Intenta de nuevo.' });
  }
};
