import { esc } from '../util.js';
import { ICONA } from './icones.js';

const MARCA = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="7" fill="#22376B"/><rect x="6" y="6" width="8.5" height="18" rx="1.5" fill="#D8E6F5"/><rect x="15.5" y="6" width="8.5" height="18" rx="1.5" fill="#D8E6F5"/><path d="M14.5 6 L6.5 15 L14.5 24" stroke="#E8A33D" stroke-width="1.4" stroke-dasharray="2.6 1.6" fill="none"/></svg>`;

// estat: { obres, reparacions, menu:{obres:bool, particulars:bool}, avisosDe:(obra)=>[] }
export function renderShell(estat, ruta) {
  const { obres = [], reparacions = [], menu = {}, avisosDe = () => [] } = estat;
  const grup = tipus => obres.filter(o => o.tipusClient === tipus)
    .sort((a, b) => String(b.numPressupost || b.creada).localeCompare(String(a.numPressupost || a.creada)));
  const constr = grup('Constructora'), parts = grup('Particular');
  const ambAvis = obres.filter(o => avisosDe(o).some(a => a.nivell === 'avis')).length;
  const repPend = reparacions.filter(r => r.estat === 'pendent').length;

  const item = (o, vista) => {
    const av = avisosDe(o).some(a => a.nivell === 'avis');
    const on = ruta.vista === vista && ruta.id === o.id ? 'on' : '';
    return `<button class="sub-item ${on}" data-ruta="#/${vista}/${encodeURIComponent(o.id)}" title="${esc(o.client)} — ${esc(o.nom)}">
      <i class="punt ${av ? 'avis' : 'ok'}"></i><span>${esc(o.client)} · ${esc(o.nom)}</span></button>`;
  };
  const desplegable = (clau, vista, titol, llista) => `
    <details data-menu="${clau}" ${menu[clau] !== false ? 'open' : ''}>
      <summary><span class="nav ${ruta.vista === vista && !ruta.id ? 'on' : ''}">${ICONA[vista]}${titol}<span class="cnt">${llista.length}</span><span class="fletxa">›</span></span></summary>
      <div class="sub-llista"><button class="sub-item" data-ruta="#/${vista}"><span>Veure-les totes</span></button>
      ${llista.length ? llista.map(o => item(o, vista)).join('') : '<div class="sub-buit">Cap de moment</div>'}</div>
    </details>`;

  return `
    <div class="marca">${MARCA}<div>Seguiment d'Obres<small>Alutec Delta</small></div></div>
    <button class="nav ${ruta.vista === 'inici' ? 'on' : ''}" data-ruta="#/inici">${ICONA.inici}Inici${ambAvis ? `<span class="cnt avis" title="Obres amb avisos">${ambAvis}</span>` : ''}</button>
    ${desplegable('obres', 'obres', 'Obres', constr)}
    ${desplegable('particulars', 'particulars', 'Particulars', parts)}
    <div style="border-top:1px solid rgba(255,255,255,.06)"><button class="nav ${ruta.vista === 'reparacions' ? 'on' : ''}" data-ruta="#/reparacions">${ICONA.reparacions}Reparacions${repPend ? `<span class="cnt">${repPend}</span>` : ''}</button></div>
    <button class="nav ${ruta.vista === 'config' ? 'on' : ''}" data-ruta="#/config">${ICONA.config}Configuració</button>
    <div class="side-peu" id="estat-dades">Dades desades en aquest ordinador</div>`;
}

export function topbar(titol, { sub = '', accions = '', amagat = false, enrere = '' } = {}) {
  return `<div class="topbar">
    <button class="btn icona boto-menu" data-accio="menu" aria-label="Menú">${ICONA.menu}</button>
    ${enrere ? `<button class="btn icona" data-ruta="${enrere}" aria-label="Tornar">${ICONA.enrere}</button>` : ''}
    <h1>${esc(titol)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>
    ${accions}
    <button class="ull ${amagat ? 'tancat' : ''}" data-accio="ull" title="${amagat ? 'Mostrar imports' : 'Amagar imports'}" aria-label="${amagat ? 'Mostrar imports' : 'Amagar imports'}">${amagat ? ICONA.ullTancat : ICONA.ull}</button>
  </div>`;
}
