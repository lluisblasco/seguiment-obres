// Carrega les dades i registra les vistes
import { app, registraVista, refresca } from '../main.js';
import { topbar } from './shell.js';
import { llista, desa } from '../db.js';
import { avisos } from '../model.js';

app.avisosDe = avisos;

export async function recarregaDades() {
  [app.obres, app.reparacions] = await Promise.all([llista('obres'), llista('reparacions')]);
}

export async function desaObra(obra) {
  await desa('obres', obra);
  const i = app.obres.findIndex(o => o.id === obra.id);
  if (i === -1) app.obres.push(obra); else app.obres[i] = obra;
}

export async function desaReparacio(rep) {
  await desa('reparacions', rep);
  const i = app.reparacions.findIndex(r => r.id === rep.id);
  if (i === -1) app.reparacions.push(rep); else app.reparacions[i] = rep;
}

import { obte } from '../db.js';
import { seedSiCal } from '../seed.js';

const afegides = await seedSiCal({ llista, desa, obte }).catch(err => { console.warn('No s\'han pogut carregar les obres inicials', err); return 0; });
await recarregaDades();
if (afegides) setTimeout(() => import('../util.js').then(u => u.toast(`${afegides} obres carregades del Z:`)), 300);

// Lectura automàtica del Z: (només a l'ordinador): la tasca de Windows «Seguiment Obres - llegir Z» actualitza
// data/obres-inicials.json cada 15 minuts; aquí s'afegeixen a «En curs» les obres noves que encara no hi són.
export async function afegeixNovesDelZ({ avisa = true } = {}) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return 0;
  const resp = await fetch('data/obres-inicials.json', { cache: 'no-store' }).catch(() => null);
  if (!resp?.ok) return 0;
  let reg;
  try { reg = await resp.json(); } catch { return 0; }
  const { obresNoves } = await import('../seed.js');
  const exclosos = (await obte('config', 'exclosos'))?.claus || [];
  const noves = obresNoves(app.obres, reg, exclosos);
  for (const o of noves) await desaObra(o);
  if (noves.length && avisa) {
    const u = await import('../util.js');
    u.toast(`${noves.length} obra${noves.length > 1 ? 'es noves' : ' nova'} del Z: ${noves.map(o => o.client).join(', ')}`);
    refresca();
  }
  return noves.length;
}
setTimeout(() => afegeixNovesDelZ().catch(() => {}), 1500);
setInterval(() => afegeixNovesDelZ().catch(() => {}), 5 * 60 * 1000);

// Vistes encara no fetes
for (const [nom, titol] of [['inici', 'Inici'], ['obres', 'Obres'], ['particulars', 'Particulars'], ['reparacions', 'Reparacions'], ['config', 'Configuració']]) {
  if (!app.vistes[nom]) registraVista(nom, () => topbar(titol, { amagat: app.amagat }) + '<div class="card buit"><b>En construcció</b>Aquesta pantalla arriba en el següent pas.</div>');
}

export { refresca };
