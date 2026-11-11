// Diàleg per crear/editar un element d'una obra (finestra, porta, barana, pèrgola...)
import { esc } from '../util.js';
import { TIPUS_ELEMENT, TIPUS_DIBUIXABLES, campsQueFalten } from '../model.js';
import { dibuixaElement, PARTS, TIPUS_MOSQUITERA, tipusMosquitera } from './dibuix.js';

const OPC = {
  serie: ['COR-70', 'COR-70 Hoja Oculta', 'COR-80', 'Millennium Plus', 'Cor Vision', 'Premiline 6040', 'Premiline 6041', '76 AD', '76 MD'],
  color: ['Blanc', 'Blanco mate', 'RAL 7016', 'RAL 9005', 'Anoditzat', 'Imitació fusta'],
  vidre: ['4/16/4', '4/16/4 mat', '3+3/16/4', '3+3/16/3+3', '6 BE/20/3+3', '4/12/4/12/4'],
  persiana: ['No', 'Monobloc', 'Caixó túnel', 'Tapa de registre'],
  mosquitera: ['No', ...TIPUS_MOSQUITERA],
};

const camp = (nom, etiqueta, valor, extra = '') =>
  `<div class="camp"><label for="el-${nom}">${etiqueta}</label><input class="inp" id="el-${nom}" name="${nom}" value="${esc(valor ?? '')}" ${extra}></div>`;
const llistaOpc = (nom, valor) => `<datalist id="dl-${nom}">${OPC[nom].map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;

export function editaElement(elInicial, { titol = 'Element' } = {}) {
  return new Promise(res => {
    const el = structuredClone(elInicial);
    el.parts ||= [];
    // Mosquiteres antigues («Enrotllable», «Mosquitera plisada»...) passen al tipus normalitzat
    if (el.mosquitera && el.mosquitera !== 'No' && !TIPUS_MOSQUITERA.includes(el.mosquitera)) el.mosquitera = tipusMosquitera(el.mosquitera);
    if (el.tipus === 'Mosquitera' && !el.mosquitera) el.mosquitera = tipusMosquitera(el.descripcio) || 'Enrotllable vertical';
    const d = document.createElement('dialog');
    d.className = 'dlg-element';
    const pinta = () => {
      const dib = TIPUS_DIBUIXABLES.has(el.tipus);
      const falten = campsQueFalten(el);
      d.innerHTML = `<form method="dialog">
        <div class="dlg-cap">${esc(titol)} ${esc(el.ref || '')}</div>
        <div class="dlg-cos el-cos">
          <div class="el-dibuix"><div id="el-svg">${dibuixaElement(el, { W: 340, H: 260, cotes: true })}</div>
            <p class="${falten.length ? 'falta' : 'complet'}">${falten.length ? `Falta: ${falten.join(', ')}` : 'Fitxa completa'}</p></div>
          <div class="el-camps">
            <div class="camp"><label>Tipus</label><div class="opts">${TIPUS_ELEMENT.map(t => `<button type="button" class="opt ${el.tipus === t ? 'on' : ''}" data-tipus="${t}">${t}</button>`).join('')}</div></div>
            <div class="graella g4">
              ${camp('ref', 'Referència', el.ref, 'placeholder="V01"')}
              ${camp('q', 'Quantitat', el.q ?? 1, 'type="number" min="1" inputmode="numeric"')}
              ${camp('w', 'Amplada (mm)', el.w || '', 'type="number" min="0" inputmode="numeric"')}
              ${camp('h', 'Alçada (mm)', el.h || '', 'type="number" min="0" inputmode="numeric"')}
            </div>
            <div class="graella g2">${camp('ubicacio', 'Ubicació', el.ubicacio, 'placeholder="Menjador, façana nord..."')}${camp('color', 'Color', el.color, 'list="dl-color"')}</div>
            ${dib ? `
            <div class="graella g2">${camp('serie', 'Sèrie', el.serie, 'list="dl-serie"')}${camp('vidre', 'Vidre', el.vidre, 'list="dl-vidre"')}</div>
            <div class="camp"><label>Fulles i parts</label><div class="parts-ll">
              ${el.parts.map((p, i) => `<div class="part-f"><b>${i + 1}</b><select class="inp" data-part="${i}">${PARTS.map(x => `<option ${x === p ? 'selected' : ''}>${x}</option>`).join('')}</select><button type="button" class="btn icona petit" data-treu="${i}" aria-label="Treure">×</button></div>`).join('')}
              <button type="button" class="btn petit" data-accio-el="part">+ Afegir fulla o part</button></div></div>
            <div class="graella g2">
              <div class="camp"><label>Persiana</label><div class="opts">${OPC.persiana.map(v => `<button type="button" class="opt ${el.persiana === v ? 'on' : ''}" data-set="persiana" data-v="${v}">${v}</button>`).join('')}</div></div>
              <div class="camp"><label>Mosquitera</label><div class="opts">${OPC.mosquitera.map(v => `<button type="button" class="opt ${el.mosquitera === v ? 'on' : ''}" data-set="mosquitera" data-v="${v}">${v}</button>`).join('')}</div></div>
            </div>` : ''}
            ${el.tipus === 'Mosquitera' ? `<div class="camp"><label>Tipus de mosquitera</label><div class="opts">${TIPUS_MOSQUITERA.map(v => `<button type="button" class="opt ${el.mosquitera === v ? 'on' : ''}" data-set="mosquitera" data-v="${v}">${v}</button>`).join('')}</div></div>` : ''}
            <div class="camp"><label for="el-descripcio">Descripció i observacions</label><textarea class="inp" id="el-descripcio" name="descripcio" placeholder="Tot el que s'ha parlat amb el client...">${esc(el.descripcio || '')}</textarea></div>
          </div>
          ${llistaOpc('serie')}${llistaOpc('color')}${llistaOpc('vidre')}
        </div>
        <div class="dlg-peu">
          ${elInicial.id ? '<button type="button" class="btn perill" data-accio-el="esborra" style="margin-right:auto">Esborrar</button><button type="button" class="btn" data-accio-el="duplica">Duplicar</button>' : ''}
          <button type="button" class="btn" data-accio-el="cancela">Cancel·lar</button>
          <button type="submit" class="btn prim">Desar</button></div></form>`;
    };
    const llegeix = () => {
      for (const i of d.querySelectorAll('input[name], textarea[name]')) {
        const v = i.value.trim();
        el[i.name] = ['q', 'w', 'h'].includes(i.name) ? (v === '' ? '' : +v) : v;
      }
    };
    const redibuixa = () => { llegeix(); d.querySelector('#el-svg').innerHTML = dibuixaElement(el, { W: 340, H: 260, cotes: true }); };
    pinta();
    d.addEventListener('input', e => { if (['w', 'h'].includes(e.target.name)) redibuixa(); });
    d.addEventListener('change', e => { if (e.target.dataset.part != null) { llegeix(); el.parts[+e.target.dataset.part] = e.target.value; pinta(); } });
    d.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tipus) { llegeix(); el.tipus = b.dataset.tipus; if (TIPUS_DIBUIXABLES.has(el.tipus) && !el.parts.length) el.parts = [el.tipus === 'Fix' ? 'Fix' : el.tipus === 'Porta' ? 'Porta E' : 'Practicable E']; pinta(); }
      else if (b.dataset.set) { llegeix(); el[b.dataset.set] = b.dataset.v; pinta(); }
      else if (b.dataset.treu != null) { llegeix(); el.parts.splice(+b.dataset.treu, 1); pinta(); }
      else if (b.dataset.accioEl === 'part') { llegeix(); el.parts.push(el.parts.length ? 'Fix' : 'Practicable E'); pinta(); }
      else if (b.dataset.accioEl === 'cancela') { d.close(); }
      else if (b.dataset.accioEl === 'esborra') { d._res = { accio: 'esborra' }; d.close(); }
      else if (b.dataset.accioEl === 'duplica') { llegeix(); d._res = { accio: 'duplica', element: el }; d.close(); }
    });
    d.addEventListener('submit', e => { e.preventDefault(); llegeix(); if (!el.tipus) { alert('Tria el tipus d\'element'); return; } d._res = { accio: 'desa', element: el }; d.close(); });
    d.addEventListener('close', () => { res(d._res || { accio: 'cancela' }); d.remove(); });
    document.body.append(d);
    d.showModal();
  });
}
