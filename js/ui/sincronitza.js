// Posa en marxa la sincronització amb el núvol (Supabase): en obrir l'app, cada 2 minuts, en recuperar la connexió
// i uns segons després de cada canvi. Si no està configurada, no fa res i l'app funciona igual que abans.
import { app, refresca } from '../main.js';
import { obte, desaCru, esborraCru, llista, quanCanvii, esborraFoto } from '../db.js';
import { planifica, ordreRemot, Nuvol, TAULES } from '../sincro.js';
import { recarregaDades } from './arrencada.js';

export const configSincro = async () => (await obte('config', 'sincro')) || null;
const desaConfig = cfg => desaCru('config', { ...cfg, id: 'sincro' });
let enCurs = null, espera = null;

export async function connecta({ url, clau, email, contrasenya }) {
  const cfg = { url: url.trim(), clau: clau.trim(), email: email.trim() };
  const n = new Nuvol(cfg);
  await n.entra(cfg.email, contrasenya);   // la contrasenya només s'usa aquí; es desa el testimoni de sessió
  await desaConfig(cfg);
  return sincronitza();
}

export async function desconnecta() { await esborraCru('config', 'sincro'); }

export function sincronitza() {
  if (!enCurs) enCurs = fes().finally(() => { enCurs = null; });
  return enCurs;
}

async function fes() {
  const cfg = await configSincro();
  if (!cfg || !navigator.onLine) return null;
  const ara = new Date().toISOString();
  const n = new Nuvol(cfg);
  try {
    const remots = await n.baixa(cfg.ultimaRebuda);
    const locals = Object.fromEntries(await Promise.all(TAULES.map(async t => [t, await llista(t)])));
    const esborrats = (await obte('config', 'esborrats'))?.items || [];
    const { aplicar, enviar } = planifica({ locals, remots, esborrats, ultimEnviament: cfg.ultimEnviament, ara });
    for (const a of aplicar) {
      if (a.accio === 'desa') { await desaCru(a.taula, a.dades); continue; }
      const vell = locals[a.taula].find(o => o.id === a.id);
      for (const f of vell?.fotos || []) await esborraFoto(f).catch(() => {});
      await esborraCru(a.taula, a.id);
      if (a.claus?.length) {   // perquè la lectura del Z: de l'ordinador no la torni a afegir
        const exc = (await obte('config', 'exclosos'))?.claus || [];
        await desaCru('config', { id: 'exclosos', claus: [...new Set([...exc, ...a.claus])] });
      }
    }
    if (enviar.length) await n.puja(enviar);
    if (esborrats.length) {   // esborrats enviats: es treuen de la llista (els nous fets mentrestant es queden)
      const resta = ((await obte('config', 'esborrats'))?.items || []).filter(e => !esborrats.some(x => x.taula === e.taula && x.id === e.id && x.mod === e.mod));
      await desaCru('config', { id: 'esborrats', items: resta });
    }
    Object.assign(cfg, { ultimaRebuda: ordreRemot(remots, cfg.ultimaRebuda), ultimEnviament: ara, darrera: new Date().toISOString(), error: '' });
    await desaConfig(cfg);
    if (aplicar.length) {
      await recarregaDades();
      // No es redibuixa mentre s'escriu, per no perdre el que s'està escrivint
      if (!document.activeElement?.matches?.('input, textarea, select') && !document.querySelector('dialog[open]')) refresca();
    }
    return { rebudes: aplicar.length, enviades: enviar.length };
  } catch (err) {
    await desaConfig({ ...cfg, error: err.message || String(err) });
    throw err;
  }
}

// Canvi desat → sincronitza al cap de 4 segons (si se'n fan molts seguits, només una vegada)
quanCanvii(() => { clearTimeout(espera); espera = setTimeout(() => sincronitza().catch(() => {}), 4000); });
window.addEventListener('online', () => sincronitza().catch(() => {}));
setTimeout(() => sincronitza().catch(() => {}), 2500);
setInterval(() => sincronitza().catch(() => {}), 2 * 60 * 1000);
