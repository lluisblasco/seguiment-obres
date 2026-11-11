// Emmagatzematge local amb IndexedDB (obres, reparacions, fotos, config)
const NOM = 'seguiment-obres';
const VERSIO = 1;
export const STORES = ['obres', 'reparacions', 'fotos', 'config'];
let dbp = null;

export function obrirDB() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(NOM, VERSIO);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  navigator.storage?.persist?.().catch(() => {});
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await obrirDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const llista = store => tx(store, 'readonly', s => s.getAll());
export const obte = (store, id) => tx(store, 'readonly', s => s.get(id));
// Obres i reparacions es marquen amb l'hora del canvi (_mod) per a la sincronització mòbil ↔ ordinador
const SINCRO = ['obres', 'reparacions'];
export let enCanviar = () => {};
export const quanCanvii = fn => { enCanviar = fn; };
export const desa = async (store, obj) => {
  if (SINCRO.includes(store)) obj._mod = new Date().toISOString();
  await tx(store, 'readwrite', s => { s.put(structuredClone(obj)); });
  if (SINCRO.includes(store)) enCanviar();
  return obj;
};
// Desa sense tocar l'hora (dades que arriben del núvol)
export const desaCru = (store, obj) => tx(store, 'readwrite', s => { s.put(structuredClone(obj)); });
export const esborraCru = (store, id) => tx(store, 'readwrite', s => s.delete(id));
export async function esborra(store, id) {
  if (SINCRO.includes(store)) {
    const o = await obte(store, id);
    if (o) {
      const llistaEsb = (await obte('config', 'esborrats'))?.items || [];
      const claus = store === 'obres' ? [o.numPressupost, o.carpeta].filter(Boolean) : [];
      llistaEsb.push({ taula: store, id, mod: new Date().toISOString(), claus });
      await desaCru('config', { id: 'esborrats', items: llistaEsb });
    }
  }
  await esborraCru(store, id);
  if (SINCRO.includes(store)) enCanviar();
}

// ---------- Fotos ----------
const urls = new Map();
export async function desaFoto(blob, meta = {}) {
  const id = crypto.randomUUID();
  await tx('fotos', 'readwrite', s => s.put({ id, blob, tipus: blob.type, data: new Date().toISOString(), ...meta }));
  return id;
}
export async function fotoURL(id) {
  if (urls.has(id)) return urls.get(id);
  const f = await obte('fotos', id);
  if (!f) return '';
  const u = URL.createObjectURL(f.blob);
  urls.set(id, u);
  return u;
}
export async function esborraFoto(id) {
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
  await esborra('fotos', id);
}

// ---------- Còpia de seguretat ----------
const blobABase64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const base64ABlob = async d => (await fetch(d)).blob();

export async function exportaTot() {
  const out = { app: 'seguiment-obres', versio: 1, data: new Date().toISOString() };
  for (const s of STORES) out[s] = await llista(s);
  out.fotos = await Promise.all(out.fotos.map(async f => ({ ...f, blob: await blobABase64(f.blob) })));
  return new Blob([JSON.stringify(out)], { type: 'application/json' });
}

export async function importaTot(fitxer) {
  const dades = JSON.parse(await fitxer.text());
  if (dades.app !== 'seguiment-obres') throw new Error('Aquest fitxer no és una còpia de Seguiment d\'Obres');
  // La mateixa obra (mateix nº de pressupost o carpeta) amb un altre id: es queda la de la còpia
  const { obresDuplicades } = await import('./seed.js');
  const existents = await llista('obres');
  for (const id of obresDuplicades(existents, dades.obres || [])) {
    const o = existents.find(x => x.id === id);
    for (const f of o.fotos || []) await esborraFoto(f);
    await esborra('obres', id);
  }
  for (const s of STORES) {
    for (const obj of dades[s] || []) {
      if (s === 'fotos') obj.blob = await base64ABlob(obj.blob);
      await tx(s, 'readwrite', st => st.put(obj));
    }
  }
  return { obres: (dades.obres || []).length, reparacions: (dades.reparacions || []).length, fotos: (dades.fotos || []).length };
}
