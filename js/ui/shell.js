import { esc } from '../util.js';
import { ICONA } from './icones.js';
import { ordenaAlfabetic } from '../model.js';

const MARCA = `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="7" fill="#22376B"/><rect x="6" y="6" width="8.5" height="18" rx="1.5" fill="#D8E6F5"/><rect x="15.5" y="6" width="8.5" height="18" rx="1.5" fill="#D8E6F5"/><path d="M14.5 6 L6.5 15 L14.5 24" stroke="#E8A33D" stroke-width="1.4" stroke-dasharray="2.6 1.6" fill="none"/></svg>`;

// estat: { obres, reparacions, menu:{obres:bool, particulars:bool}, avisosDe:(obra)=>[] }
export function renderShell(estat, ruta) {
  const { obres = [], reparacions = [], menu = {}, avisosDe = () => [] } = estat;
  const fm = estat.filtreMat || 'Tot';
  const passaMat = o => fm === 'Tot' || (fm === 'PVC' ? o.material === 'PVC' : o.material !== 'PVC');
  const grup = tipus => ordenaAlfabetic(obres.filter(o => o.tipusClient === tipus && passaMat(o)));
  const constr = grup('Constructora'), parts = grup('Particular');
  const ambAvis = obres.filter(o => avisosDe(o).some(a => a.nivell === 'avis')).length;
  const repPend = reparacions.filter(r => r.estat === 'pendent').length;

  const item = (o, vista) => {
    const av = avisosDe(o).some(a => a.nivell === 'avis');
    const on = ruta.vista === vista && ruta.id === o.id ? 'on' : '';
    return `<button class="sub-item ${on}" data-ruta="#/${vista}/${encodeURIComponent(o.id)}" title="${esc(o.client)} — ${esc(o.nom)}">
      <i class="punt ${av ? 'avis' : 'ok'}"></i><span>${esc(o.client)} · ${esc(o.nom)}</span></button>`;
  };
  const acabada = o => !!o.etapes?.[11];
  const seccio = (on, ruta_, titol, n, mat = '') => `<button class="sub-cap ${on ? 'on' : ''}" data-ruta="${ruta_}"${mat ? ` data-mat="${mat}"` : ''}><span>${titol}</span><b>${n}</b></button>`;
  const llistaItems = (l, vista) => (l.length ? l.map(o => item(o, vista)).join('') : '<div class="sub-buit">Cap de moment</div>');
  // Obres → Alumini (En curs / Finalitzades) i PVC (En curs / Finalitzades)
  const blocMaterial = (clau, vista, mat, llista) => {
    const delMat = llista.filter(o => (mat === 'PVC' ? o.material === 'PVC' : o.material !== 'PVC'));
    const enCurs = delMat.filter(o => !acabada(o)), fins = delMat.filter(acabada);
    const aqui = ruta.vista === vista && (estat.matLlista || fm) === mat;
    return `
      <details data-menu="${clau}-${mat}" ${menu[`${clau}-${mat}`] !== false ? 'open' : ''} class="mat">
        <summary><span class="sub-matcap">${mat}<b>${enCurs.length}</b></span></summary>
        ${seccio(aqui && !ruta.id, `#/${vista}`, 'En curs', enCurs.length, mat)}
        ${llistaItems(enCurs, vista)}
        <details data-menu="${clau}-${mat}-fin" ${menu[`${clau}-${mat}-fin`] ? 'open' : ''} class="fin">
          <summary>${seccio(aqui && ruta.id === 'finalitzades', `#/${vista}/finalitzades`, 'Finalitzades', fins.length, mat)}</summary>
          ${llistaItems(fins, vista)}
        </details>
      </details>`;
  };
  const desplegable = (clau, vista, titol, llista) => {
    const enCurs = llista.filter(o => !acabada(o));
    const materials = fm === 'Tot' ? ['Alumini', 'PVC'] : [fm];
    return `
    <details data-menu="${clau}" ${menu[clau] !== false ? 'open' : ''}>
      <summary><span class="nav ${ruta.vista === vista && (!ruta.id || ruta.id === 'finalitzades') ? 'on' : ''}">${ICONA[vista]}${titol}<span class="cnt">${enCurs.length}</span><span class="fletxa">›</span></span></summary>
      <div class="sub-llista">${materials.map(m => blocMaterial(clau, vista, m, llista)).join('')}</div>
    </details>`;
  };
  const repFin = reparacions.filter(r => r.estat === 'feta' || r.estat === 'facturada').length;

  return `
    <div class="marca">${MARCA}<div>Seguiment d'Obres<small>Alutec Delta</small></div></div>
    <div class="filtre-mat" role="group" aria-label="Material">${['Tot', 'Alumini', 'PVC'].map(m => `<button class="${fm === m ? 'on' : ''}" data-accio="mat" data-mat="${m}" aria-pressed="${fm === m}">${m}</button>`).join('')}</div>
    <button class="nav ${ruta.vista === 'inici' ? 'on' : ''}" data-ruta="#/inici">${ICONA.inici}Inici${ambAvis ? `<span class="cnt avis" title="Obres amb avisos">${ambAvis}</span>` : ''}</button>
    ${desplegable('obres', 'obres', 'Obres', constr)}
    ${desplegable('particulars', 'particulars', 'Particulars', parts)}
    <details data-menu="reparacions" ${menu.reparacions !== false ? 'open' : ''}>
      <summary><span class="nav ${ruta.vista === 'reparacions' ? 'on' : ''}">${ICONA.reparacions}Reparacions<span class="cnt">${repPend}</span><span class="fletxa">›</span></span></summary>
      <div class="sub-llista">
        ${seccio(ruta.vista === 'reparacions' && ruta.id !== 'finalitzades', '#/reparacions', 'En curs', repPend)}
        ${seccio(ruta.vista === 'reparacions' && ruta.id === 'finalitzades', '#/reparacions/finalitzades', 'Finalitzades', repFin)}
      </div>
    </details>
    <button class="nav ${ruta.vista === 'config' ? 'on' : ''}" data-ruta="#/config">${ICONA.config}Configuració</button>
    <div class="side-peu" id="estat-dades">Dades desades en aquest dispositiu</div>`;
}

export function topbar(titol, { sub = '', accions = '', amagat = false, enrere = '' } = {}) {
  return `<div class="topbar">
    <button class="btn icona boto-menu" data-accio="menu" aria-label="Menú">${ICONA.menu}</button>
    ${enrere ? `<button class="btn icona" data-ruta="${enrere}" aria-label="Tornar">${ICONA.enrere}</button>` : ''}
    <h1>${esc(titol)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>
    ${accions}
    <button class="btn icona boto-menu" data-ruta="#/config" aria-label="Configuració" title="Configuració">${ICONA.config}</button>
    <button class="ull ${amagat ? 'tancat' : ''}" data-accio="ull" title="${amagat ? 'Mostrar imports' : 'Amagar imports'}" aria-label="${amagat ? 'Mostrar imports' : 'Amagar imports'}">${amagat ? ICONA.ullTancat : ICONA.ull}</button>
  </div>`;
}
