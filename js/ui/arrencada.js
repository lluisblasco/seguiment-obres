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

// Vistes encara no fetes
for (const [nom, titol] of [['inici', 'Inici'], ['obres', 'Obres'], ['particulars', 'Particulars'], ['reparacions', 'Reparacions'], ['config', 'Configuració']]) {
  if (!app.vistes[nom]) registraVista(nom, () => topbar(titol, { amagat: app.amagat }) + '<div class="card buit"><b>En construcció</b>Aquesta pantalla arriba en el següent pas.</div>');
}

export { refresca };
