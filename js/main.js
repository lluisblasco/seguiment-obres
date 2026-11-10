import { parseRuta } from './rutes.js';
import { renderShell, topbar } from './ui/shell.js';
import { guardaLocal, llegeixLocal } from './util.js';

// Estat global de l'app
export const app = {
  obres: [],
  reparacions: [],
  amagat: llegeixLocal('so.amagaDiners', false),
  menu: llegeixLocal('so.menu', {}),
  avisosDe: () => [],
  vistes: {},          // nom -> async (ruta, app) => html
  despres: {},         // nom -> (arrel, ruta, app) => void (enllaçar esdeveniments)
};

export function registraVista(nom, render, despres) {
  app.vistes[nom] = render;
  if (despres) app.despres[nom] = despres;
}

export async function refresca() {
  const ruta = parseRuta(location.hash);
  document.getElementById('side').innerHTML = renderShell(app, ruta);
  // Element nou a cada render: així els detectors de clics de la vista anterior no s'acumulen
  const vella = document.getElementById('vista');
  const vista = vella.cloneNode(false);
  const scroll = window.scrollY;
  const render = app.vistes[ruta.vista];
  vista.innerHTML = render ? await render(ruta, app) : topbar('En construcció', { amagat: app.amagat });
  vella.replaceWith(vista);
  if (app._mateixaRuta === location.hash) window.scrollTo(0, scroll);
  app._mateixaRuta = location.hash;
  app.despres[ruta.vista]?.(vista, ruta, app);
  document.getElementById('app').classList.remove('menu-obert');
}

export function navega(hash) {
  if (location.hash === hash) refresca(); else location.hash = hash;
}

// Clics globals: rutes, ull, menú mòbil
document.addEventListener('click', e => {
  // Mòbil: tocar fora del menú obert el tanca
  const arrel = document.getElementById('app');
  if (arrel.classList.contains('menu-obert') && !e.target.closest('.side') && !e.target.closest('[data-accio="menu"]')) {
    arrel.classList.remove('menu-obert'); return;
  }
  const r = e.target.closest('[data-ruta]');
  if (r) { e.preventDefault(); navega(r.dataset.ruta); return; }
  const a = e.target.closest('[data-accio]');
  if (!a) return;
  if (a.dataset.accio === 'ull') { app.amagat = !app.amagat; guardaLocal('so.amagaDiners', app.amagat); refresca(); }
  if (a.dataset.accio === 'menu') document.getElementById('app').classList.toggle('menu-obert');
});
// Recordar desplegables oberts/tancats
document.addEventListener('toggle', e => {
  const k = e.target?.dataset?.menu;
  if (k) { app.menu[k] = e.target.open; guardaLocal('so.menu', app.menu); }
}, true);
window.addEventListener('hashchange', refresca);

// Arrencada: els mòduls de vistes es registren en importar-se
const moduls = ['./ui/arrencada.js', './ui/inici.js', './ui/obra.js', './ui/reparacions.js', './ui/config.js'];
Promise.all(moduls.map(m => import(m).catch(err => console.warn('Mòdul no disponible:', m, err.message))))
  .then(refresca);

// Funcionament sense connexió
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Sense mode fora de línia:', err.message));
}
