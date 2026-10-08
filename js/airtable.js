export const AT_TOKEN = 'patONLilEuhcfVDWr.b4695f9d133de2020b05102c4d31d80e146617a9ecf05b83a6c17276b757d9a5'; // Reemplaza con tu Personal Access Token de airtable.com/create/tokens

export const BASE_ID = 'apppQCdCQ211ydjbA';
export const TABLES = {
  grupos:       'tblCchzDiLhWuag4T',
  miembros:     'tblVb1G0mMIwCDPwi',
  eventos:      'tbl3kJkuFevmo38DV',
  usuarios:     'tblbCOwG5JN1aNVcj',
  seguimientos: 'tblTo1PtutoYbMq8a',
  clases:       'tbl22JS1OMLwY1Dcw',
  evaluaciones: 'tblwWvgxg1cD1hH3K',
};

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

export async function atFetch(table, params = '') {
  const url = `${BASE_URL}/${TABLES[table]}${params}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${AT_TOKEN}` } });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function atPost(table, body) {
  const r = await fetch(`${BASE_URL}/${TABLES[table]}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ typecast: true, ...body }),
  });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function atPatch(table, id, fields) {
  const r = await fetch(`${BASE_URL}/${TABLES[table]}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function atDelete(table, id) {
  const r = await fetch(`${BASE_URL}/${TABLES[table]}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${AT_TOKEN}` },
  });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

// Sube un archivo (PDF, etc.) directo a un campo de tipo Attachment, en base64.
// No requiere hosting externo: Airtable acepta el contenido del archivo tal cual.
export async function atUploadAttachment(recordId, fieldName, base64, filename, contentType) {
  const url = `https://content.airtable.com/v0/${BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, file: base64, filename }),
  });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function atFetchAll(table) {
  const records = [];
  let offset = '';
  do {
    const data = await atFetch(table, offset ? `?offset=${offset}` : '');
    records.push(...data.records);
    offset = data.offset || '';
  } while (offset);
  return records;
}
