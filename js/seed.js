// Converteix les obres extretes del Z: (importacio/extreure_obres.py) en obres de l'app
import { novaObra, inferirEtapes } from './model.js';

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Import sense IVA d'un registre del Z: la base imposable del PDF o, si no n'hi ha, el total / 1,21
export function senseIva(r) {
  if (Number.isFinite(+r.base) && +r.base > 0) return Math.round(+r.base * 100) / 100;
  if (Number.isFinite(+r.total) && +r.total > 0) return Math.round(+r.total / 1.21 * 100) / 100;
  return null;
}

export function obresDesDeImportacio(registres = []) {
  return registres.map(r => {
    const constructora = r.tipus === 'Constructora';
    const total = Number.isFinite(+r.total) && +r.total > 0 ? +r.total : null;
    const base = senseIva(r);
    return novaObra({
      client: r.client || '',
      nom: r.nom || '',
      tipusClient: constructora ? 'Constructora' : 'Particular',
      material: r.material || 'Alumini',
      numPressupost: r.num || '',
      import: base,          // sense IVA (base imposable): és el que mostra l'app
      importAmbIva: total,
      bestreta: constructora ? 'no cal' : 'pendent',
      telefon: r.tel || '',
      adreca: r.adreca || '',
      dataPressupost: r.data || '',
      carpeta: r.carpeta || '',
      creada: r.creada ? `${r.creada}T00:00:00.000Z` : new Date().toISOString(),
      origen: 'Z',
      etapes: inferirEtapes({ mides: !!r.mides, comanda: !!r.comanda, fulla: !!r.fulla }),
      elements: (r.elements || []).map(e => ({ id: uid(), q: 1, parts: [], ...e })),
    });
  });
}

// Primer arrencada: si no hi ha cap obra, carrega les del Z:
export async function seedSiCal({ llista, desa, obte }) {
  const ja = await obte('config', 'seed');
  if (ja) return 0;
  const existents = await llista('obres');
  let afegides = 0;
  if (!existents.length) {
    const resp = await fetch('data/obres-inicials.json', { cache: 'no-store' });
    if (resp.ok) {
      for (const o of obresDesDeImportacio((await resp.json()).filter(passaMinim))) { await desa('obres', o); afegides++; }
    }
  }
  await desa('config', { id: 'seed', data: new Date().toISOString(), afegides });
  return afegides;
}

// En restaurar una còpia: obres existents (amb un altre id) que són la mateixa obra que una de la còpia
export function obresDuplicades(existents, importades) {
  const claus = new Map();
  for (const o of importades) for (const k of [o.numPressupost, o.carpeta].filter(Boolean)) claus.set(k, o.id);
  return existents.filter(o => [o.numPressupost, o.carpeta].filter(Boolean).some(k => claus.has(k) && claus.get(k) !== o.id)).map(o => o.id);
}

// Import mínim per seguir una obra (decisió del Lluís, 10/11/2026). Sense import conegut, es manté.
export const IMPORT_MINIM = { Particular: 1000, Constructora: 3500 };
export function passaMinim(x) {
  const tipus = x.tipusClient || x.tipus || 'Particular';
  const imp = x.import !== undefined ? x.import : senseIva(x);
  if (imp == null || imp === '' || !Number.isFinite(+imp)) return true;
  return +imp >= (IMPORT_MINIM[tipus] ?? 0);
}

// Afegeix les obres noves del Z: que encara no hi són (per número de pressupost o carpeta) i passen l'import mínim
export function obresNoves(existents, registres) {
  const claus = new Set(existents.flatMap(o => [o.numPressupost, o.carpeta].filter(Boolean)));
  return obresDesDeImportacio(registres.filter(r => !claus.has(r.num) && !claus.has(r.carpeta) && passaMinim(r)));
}
