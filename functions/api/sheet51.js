const SPREADSHEET_ID = '1A-Uzz8q32PdNOcTXLwpPLT-9RAmCc3ZtYL-LdRU8avA';
const ALLOWED_TABS = new Set(['user_pet_images', 'User_pet_images', 'Sheet51', 'sheet51', '51']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function clean(v) { return String(v ?? '').trim(); }

function parseGviz(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Google Sheet did not return gviz JSON.');
  const data = JSON.parse(text.slice(start, end + 1));
  const table = data.table || {};
  let headers = (table.cols || []).map((c, i) => clean(c.label || c.id || ('col' + i)));
  let rows = (table.rows || []).map(r => {
    const out = {};
    (r.c || []).forEach((cell, i) => { out[headers[i] || ('col' + i)] = cell ? cell.v : ''; });
    return out;
  });
  if (!headers.some(h => h.toLowerCase() === 'user_id') && rows.length) {
    const first = rows[0];
    const firstVals = headers.map(h => clean(first[h]));
    if (firstVals.some(v => v.toLowerCase() === 'user_id')) {
      const oldHeaders = headers;
      headers = firstVals;
      rows = rows.slice(1).map(r => {
        const out = {};
        oldHeaders.forEach((h, i) => { out[headers[i] || ('col' + i)] = r[h]; });
        return out;
      });
    }
  }
  return rows;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return json({ ok: true });
  if (request.method !== 'GET') return json({ success: false, error: 'Read-only endpoint only allows GET.' }, 405);
  const url = new URL(request.url);
  const tab = clean(url.searchParams.get('tab') || 'user_pet_images');
  if (!ALLOWED_TABS.has(tab)) return json({ success: false, error: 'Blocked tab. This endpoint only reads sheet 51 / user_pet_images.', tab }, 403);
  const gviz = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(gviz, { headers: { 'accept': 'text/plain,*/*' } });
  const text = await res.text();
  if (!res.ok) return json({ success: false, error: `Google Sheets returned HTTP ${res.status}`, tab }, 502);
  const rows = parseGviz(text);
  return json({ success: true, tab, rows, row_count: rows.length, source: 'sheet51/user_pet_images/read_only' });
}
