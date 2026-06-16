export const AT_TOKEN = 'pathei6xJMyKgFRJk.07f6a0efda090bffb60cd61e59f79bf6cfd5e33233ad81445df994271d802df2'; // Reemplaza con tu Personal Access Token de airtable.com/create/tokens

export const BASE_ID = 'apppQCdCQ211ydjbA';
export const TABLES = {
  grupos: 'tblCchzDiLhWuag4T',
  miembros: 'tblVb1G0mMIwCDPwi',
  eventos: 'tbl3kJkuFevmo38DV',
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
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Airtable error ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function atPatch(table, id, fields) {
  const r = await fetch(`${BASE_URL}/${TABLES[table]}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
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
