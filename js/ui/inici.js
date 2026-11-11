// Inici: resum compacte, una línia per obra amb les 12 etapes
import { app, registraVista, refresca, navega } from '../main.js';
import { topbar } from './shell.js';
import { esc, toast, guardaLocal, llegeixLocal } from '../util.js';
import { ETAPES, ETAPES_CURT, ordenaAlfabetic, etapaActual, avisos, fmtDiners, estadistiques, marcaEtapa, progresSubtasques, SUBTASQUES } from '../model.js';
import { desaObra } from './arrencada.js';

const FILTRES = ['Totes', 'Obres', 'Particulars', 'Amb avisos'];
const GRUPS = [['Abans d\'acceptar', 0, 4], ['Comandes i material', 5, 6], ['Al taller', 7, 9], ['Muntatge', 10, 10]];
const vistaDe = o => (o.tipusClient === 'Constructora' ? 'obres' : 'particulars');
const acabada = o => o.etapes?.[11];

function render() {
  const filtre = llegeixLocal('so.filtreInici', 'Totes');
  const totes = ordenaAlfabetic(app.obres.filter(o => !o.etapes?.[11]));
  const ambAvis = o => avisos(o).some(a => a.nivell === 'avis');
  const llista = totes.filter(o => filtre === 'Obres' ? o.tipusClient === 'Constructora' : filtre === 'Particulars' ? o.tipusClient === 'Particular' : filtre === 'Amb avisos' ? ambAvis(o) : true);

  const obertes = app.obres.filter(o => !acabada(o));
  const importEnCurs = obertes.reduce((a, o) => a + (+o.import || 0), 0);
  const unitats = obertes.reduce((a, o) => a + estadistiques(o).unitats, 0);
  const grups = GRUPS.map(([l, a, b]) => ({ l, n: app.obres.filter(o => { const e = etapaActual(o); return acabada(o) ? a === 11 : e >= a && e <= b; }).length }));
  const maxG = Math.max(1, ...grups.map(g => g.n));
  const oc = { rebuda: 0, demanada: 0, pendent: 0 };
  app.obres.forEach(o => (o.comandes || []).forEach(c => { oc[c.estat] = (oc[c.estat] || 0) + 1; }));
  const totC = oc.rebuda + oc.demanada + oc.pendent;
  const SC = { rebuda: ['Rebudes', 'var(--ok)'], demanada: ['Demanades', 'var(--blau)'], pendent: ['Per demanar', 'var(--contrast)'] };

  const fila = o => {
    const act = etapaActual(o), av = avisos(o), te = av.some(a => a.nivell === 'avis');
    const cel = (i) => {
      const feta = !!o.etapes?.[i], ara = !feta && i === act;
      const pr = progresSubtasques(o, i), parcial = pr && !feta && pr.fetes > 0;
      const detall = pr ? ` (${pr.fetes}/${pr.total}: ${SUBTASQUES.map(s => `${s} ${o.subtasques?.[i]?.[s] ?? feta ? '✓' : '·'}`).join(', ')})` : '';
      return `<td class="et"><button class="etc ${feta ? 'feta' : parcial ? 'parcial' : ara ? 'ara' : ''}" data-etapa="${i}" data-obra="${o.id}"
        title="${esc(ETAPES[i])}: ${feta ? 'feta' : 'pendent'}${esc(detall)} — clica per ${feta ? 'desmarcar' : 'marcar com a feta'}" aria-label="${esc(ETAPES[i])} ${feta ? 'feta' : 'pendent'}">${feta ? '✓' : parcial ? pr.fetes : ''}</button></td>`;
    };
    return `<tr data-obrir="#/${vistaDe(o)}/${encodeURIComponent(o.id)}">
      <td class="num">${esc(String(o.numPressupost || '').slice(4)) || '—'}</td>
      <td class="nom"><b>${esc(o.client)}</b><span>${esc(o.nom)}</span></td>
      <td><span class="tc ${o.tipusClient === 'Constructora' ? 'c' : 'p'}" title="${esc(o.tipusClient)}">${o.tipusClient === 'Constructora' ? 'Obra' : 'Part.'}</span></td>
      <td class="mat">${esc(o.material || '')}</td>
      ${ETAPES.map((_, i) => cel(i)).join('')}
      <td class="avis-c">${te ? `<span class="pill avis" title="${esc(av.filter(a => a.nivell === 'avis').map(a => a.text).join(' · '))}">⚠ ${esc(av.find(a => a.nivell === 'avis').text)}</span>` : `<span class="pill ok">✓ ${esc(av[0]?.text || '')}</span>`}</td>
      <td class="imp diners">${fmtDiners(o.import, app.amagat)}</td>
    </tr>`;
  };

  return topbar('Inici', { sub: `${obertes.length} obres en curs`, amagat: app.amagat, accions: `<button class="btn prim" data-accio="nova-obra">+ Nova obra</button>` }) + `
  <section class="resum"><div class="xifres">
    <div class="xifra"><b>${obertes.length}</b><span>Obres en curs</span></div>
    <div class="xifra"><b>${obertes.filter(o => o.tipusClient === 'Particular').length}<i>/${obertes.filter(o => o.tipusClient === 'Constructora').length}</i></b><span>Particulars / obres</span></div>
    <div class="xifra"><b>${unitats}</b><span>Elements en curs</span></div>
    <div class="xifra"><b class="diners">${fmtDiners(importEnCurs, app.amagat)}</b><span>Import en curs (sense IVA)</span></div></div>
    <div class="card mini-graf"><h3>Obres per etapa</h3>
      ${grups.map(g => `<div class="hb" title="${esc(g.l)}: ${g.n}"><span>${esc(g.l)}</span><i><em style="width:${g.n / maxG * 100}%"></em></i><b>${g.n}</b></div>`).join('')}</div>
    <div class="card mini-graf"><h3>Comandes</h3>
      ${totC ? `<div class="apilat">${['rebuda', 'demanada', 'pendent'].filter(k => oc[k]).map(k => `<i title="${SC[k][0]}: ${oc[k]}" style="flex:${oc[k]};background:${SC[k][1]}"></i>`).join('')}</div>
      <div class="llegenda">${['rebuda', 'demanada', 'pendent'].map(k => `<span><b style="background:${SC[k][1]}"></b>${SC[k][0]} <strong>${oc[k]}</strong></span>`).join('')}</div>`
      : '<p class="nota">Encara no hi ha comandes. Es generen des dels elements de cada obra.</p>'}</div>
  </section>
  <div class="filtres">${FILTRES.map(f => `<button class="opt ${f === filtre ? 'on' : ''}" data-filtre="${f}">${f}</button>`).join('')}
    <span class="llegenda-et"><i class="etc feta">✓</i> feta <i class="etc ara"></i> ara <i class="etc"></i> pendent · clica una etapa per marcar-la</span></div>
  <div class="card taula-wrap">
    ${llista.length ? `<table class="taula-obres">
      <thead><tr><th>Nº</th><th>Client · obra</th><th>Tipus</th><th>Mat.</th>${ETAPES_CURT.map((c, i) => `<th class="et" title="${esc(ETAPES[i])}">${c}</th>`).join('')}<th>Estat</th><th class="imp">Import</th></tr></thead>
      <tbody>${llista.map(fila).join('')}</tbody></table>`
      : `<div class="buit"><b>Cap obra en aquest filtre</b>Canvia el filtre o crea una obra nova.</div>`}
  </div>
  <div class="llista-mobil">${llista.map(o => {
    const act = etapaActual(o), av = avisos(o), te = av.some(a => a.nivell === 'avis');
    return `<button class="card targeta" data-obrir="#/${vistaDe(o)}/${encodeURIComponent(o.id)}">
      <div class="t-cap"><b>${esc(o.client)}</b><span class="tc ${o.tipusClient === 'Constructora' ? 'c' : 'p'}">${o.tipusClient === 'Constructora' ? 'Obra' : 'Part.'}</span></div>
      <div class="t-nom">${esc(o.nom)}</div>
      <div class="barra-et">${ETAPES.map((_, i) => `<i class="${o.etapes[i] ? 'f' : i === act ? 'a' : ''}"></i>`).join('')}</div>
      <div class="t-et"><b>${o.etapes[11] ? 'Acabada' : esc(ETAPES[act])}</b><span class="diners">${fmtDiners(o.import, app.amagat)}</span></div>
      <span class="pill ${te ? 'avis' : 'ok'}">${te ? '⚠' : '✓'} ${esc((av.find(a => a.nivell === 'avis') || av[0]).text)}</span>
    </button>`;
  }).join('')}</div>`;
}

function despres(arrel) {
  arrel.addEventListener('click', async e => {
    const f = e.target.closest('[data-filtre]');
    if (f) { guardaLocal('so.filtreInici', f.dataset.filtre); refresca(); return; }
    const c = e.target.closest('[data-etapa]');
    if (c) {
      e.stopPropagation();
      const o = app.obres.find(x => x.id === c.dataset.obra);
      const i = +c.dataset.etapa;
      marcaEtapa(o, i, !o.etapes[i]);
      await desaObra(o);
      toast(`${o.client}: ${ETAPES[i]} ${o.etapes[i] ? 'feta' : 'pendent'}`);
      refresca();
      return;
    }
    const tr = e.target.closest('[data-obrir]');
    if (tr) navega(tr.dataset.obrir);
  });
}

registraVista('inici', render, despres);
