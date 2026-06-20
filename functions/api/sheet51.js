const SPREADSHEET_ID = '1A-Uzz8q32PdNOcTXLwpPLT-9RAmCc3ZtYL-LdRU8avA';
const ALLOWED_TABS = new Set(['user_pet_images', 'User_pet_images', 'Sheet51', 'sheet51', 'Sheet 51', 'sheet 51', '51']);

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
function lower(v) { return clean(v).toLowerCase(); }
function isWebUrl(v) { return /^https?:\/\//i.test(clean(v)); }
function rowVal(row, names) {
  const keys = Object.keys(row || {});
  for (const wanted of names) {
    const hit = keys.find(k => lower(k) === lower(wanted));
    if (hit) return clean(row[hit]);
  }
  return '';
}
function normalizeAction(v) {
  v = lower(v);
  if (v === 'medicine' || v === 'med') return 'heal';
  if (v === 'sleep') return 'rest';
  if (v === 'bag' || v === 'items') return 'inventory';
  if (v === 'store') return 'shop';
  return v;
}
function aliasesForPet(userId, petCode) {
  userId = lower(userId); petCode = lower(petCode);
  const out = [];
  const add = v => { v = lower(v); if (v && !out.includes(v)) out.push(v); };
  add(petCode);
  if (userId && petCode && !petCode.startsWith(userId + '_')) add(userId + '_' + petCode);
  if (userId && petCode.startsWith(userId + '_')) add(petCode.slice(userId.length + 1));
  return out;
}
function parseGviz(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Google Sheet did not return gviz JSON. Is the sheet/tab readable?');
  const data = JSON.parse(text.slice(start, end + 1));
  const table = data.table || {};
  let headers = (table.cols || []).map((c, i) => clean(c.label || c.id || ('col' + i)));
  let rows = (table.rows || []).map(r => {
    const out = {};
    (r.c || []).forEach((cell, i) => {
      // Use formatted value first. This prevents Discord IDs becoming 1.21467E+18.
      out[headers[i] || ('col' + i)] = cell ? clean(cell.f ?? cell.v ?? '') : '';
    });
    return out;
  });
  if (!headers.some(h => lower(h) === 'user_id') && rows.length) {
    const first = rows[0];
    const firstVals = headers.map(h => clean(first[h]));
    if (firstVals.some(v => lower(v) === 'user_id')) {
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
function cloudinaryUrlFromPublicId(publicId) {
  publicId = clean(publicId);
  if (!publicId) return '';
  if (isWebUrl(publicId)) return publicId;
  return `https://res.cloudinary.com/dpwlfmhia/image/upload/${publicId}`;
}
function imageFromRow(row) {
  const imageUrl = rowVal(row, ['image_url', 'url', 'custom_image_url', 'pet_image_url']);
  if (isWebUrl(imageUrl)) return imageUrl;
  const publicId = rowVal(row, ['Cloudinary Public ID', 'cloudinary_public_id', 'public_id', 'asset_public_id']);
  return cloudinaryUrlFromPublicId(publicId);
}
function activeOk(row) {
  const active = lower(rowVal(row, ['active', 'enabled', 'Looks Right?', 'looks_right']) || 'TRUE');
  return !(active === 'false' || active === 'no' || active === '0' || active === 'bad');
}
function sectionOk(row) {
  const section = lower(rowVal(row, ['Section', 'section', 'image_type', 'type']));
  return !section || section === 'pet' || section === 'main' || section === 'normal' || section === 'idle';
}
function actionOk(row, action) {
  const actionKey = normalizeAction(rowVal(row, ['action_key', 'action']));
  if (!actionKey) return true;
  if (action === 'main') return actionKey === 'main' || actionKey === 'normal' || actionKey === 'idle';
  return actionKey === action;
}
function genericPetMatch(row, species, petName) {
  const target = lower(rowVal(row, ['Pet / Target', 'Pet/Target', 'pet_target', 'target', 'pet', 'animal', 'species']));
  const assetKey = lower(rowVal(row, ['Asset Key', 'asset_key', 'key']));
  const assetName = lower(rowVal(row, ['Asset Name', 'asset_name', 'name']));
  const category = lower(rowVal(row, ['Category', 'category']));
  const values = [target, assetKey, assetName, category].filter(Boolean);
  return (species && values.includes(species)) || (petName && values.includes(petName));
}
function findPetImage(rows, { userId, petCode, petName, pet, action }) {
  userId = clean(userId);
  petName = lower(petName);
  const species = lower(pet);
  action = normalizeAction(action || 'main');
  const aliases = aliasesForPet(userId, petCode);

  // 1) First try user-specific image rows from user_pet_images.
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] || {};
    if (!activeOk(row) || !sectionOk(row) || !actionOk(row, action)) continue;
    const rowUser = rowVal(row, ['user_id', 'discord_id', 'user']);
    if (!rowUser || (userId && rowUser !== userId)) continue;
    const rowPetCode = lower(rowVal(row, ['pet_code', 'pet_id', 'selected_pet_code']));
    const rowPetName = lower(rowVal(row, ['pet_name', 'name']));
    const codeMatch = rowPetCode && aliases.includes(rowPetCode);
    const nameMatch = petName && rowPetName && rowPetName === petName;
    if (!codeMatch && !nameMatch) continue;
    const img = imageFromRow(row);
    if (isWebUrl(img)) return { image_url: img, matched_row_index: i + 2, matched_by: codeMatch ? 'user_id+pet_code' : 'user_id+pet_name', match_type: 'owned_pet_image_row' };
  }

  // 2) Then try Sheet 51 asset catalog rows like:
  // Category | BG No | BG Key | Section | Pet / Target | Asset Key | ... | image_url
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] || {};
    if (!activeOk(row) || !sectionOk(row) || !actionOk(row, action)) continue;
    const rowUser = rowVal(row, ['user_id', 'discord_id', 'user']);
    if (rowUser && userId && rowUser !== userId) continue;
    if (!genericPetMatch(row, species, petName)) continue;
    const img = imageFromRow(row);
    if (isWebUrl(img)) {
      return {
        image_url: img,
        matched_row_index: i + 2,
        matched_by: species ? 'sheet51 pet/target species' : 'sheet51 pet/target name',
        match_type: 'sheet51_asset_catalog_row',
        width: rowVal(row, ['Width', 'width']),
        scale: rowVal(row, ['Scale', 'scale']),
        x: rowVal(row, ['X', 'x']),
        y: rowVal(row, ['Y', 'y']),
        z: rowVal(row, ['Z', 'z'])
      };
    }
  }
  return null;
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

  let rows;
  try { rows = parseGviz(text); }
  catch (e) { return json({ success: false, error: e.message, tab }, 502); }

  const userId = clean(url.searchParams.get('user_id') || '');
  const petCode = clean(url.searchParams.get('pet_code') || '');
  const petName = clean(url.searchParams.get('pet_name') || '');
  const pet = clean(url.searchParams.get('pet') || url.searchParams.get('species') || '');
  const action = clean(url.searchParams.get('action') || 'main');
  let match = null;
  if (petCode || petName || pet) match = findPetImage(rows, { userId, petCode, petName, pet, action });

  return json({
    success: true,
    tab,
    row_count: rows.length,
    source: 'sheet51/user_pet_images/read_only',
    user_id: userId,
    pet_code: petCode,
    pet_name: petName,
    pet,
    action,
    image_url: match ? match.image_url : '',
    match: match || null,
    reason: match ? 'matched sheet51 row' : 'no active Sheet 51 row matched. Checked user_id+pet_code, user_id+pet_name, then generic Section=pet with Pet / Target or Asset Key matching species.',
    rows: url.searchParams.get('include_rows') === '1' ? rows : undefined
  });
}
