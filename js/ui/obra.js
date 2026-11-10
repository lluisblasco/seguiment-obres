// Obres i Particulars: llista i detall de cada obra
import { app, registraVista, refresca, navega } from '../main.js';
import { topbar } from './shell.js';
import { esc, toast, confirma, dataCurta, guardaLocal, llegeixLocal, atributsDiners } from '../util.js';
import { ETAPES, novaObra, etapaActual, avisos, estadistiques, comandesDesDElements, fmtDiners, TIPUS_DIBUIXABLES, campsQueFalten } from '../model.js';
import { desaObra } from './arrencada.js';
import { esborra, desaFoto, fotoURL, esborraFoto } from '../db.js';
import { comprimeixFoto } from '../fotos.js';
import { dibuixaElement } from './dibuix.js';
import { editaElement } from './element.js';
import { ICONA } from './icones.js';

const tipusDeVista = v => (v === 'obres' ? 'Constructora' : 'Particular');
const vistaDe = o => (o.tipusClient === 'Constructora' ? 'obres' : 'particulars');
const uid = () => crypto.randomUUID();

// ---------------- Llista ----------------
function llista(ruta) {
  const tipus = tipusDeVista(ruta.vista);
  const obres = app.obres.filter(o => o.tipusClient === tipus).sort((a, b) => etapaActual(a) - etapaActual(b) || String(b.numPressupost).localeCompare(String(a.numPressupost)));
  const titol = ruta.vista === 'obres' ? 'Obres' : 'Particulars';
  return topbar(titol, { sub: `${obres.length}`, amagat: app.amagat, accions: `<button class="btn prim" data-accio="nova-obra" data-tipus="${tipus}">+ Nou${ruta.vista === 'obres' ? 'a obra' : ' particular'}</button>` }) +
    (obres.length ? `<div class="targetes">${obres.map(o => {
      const act = etapaActual(o), av = avisos(o), te = av.some(a => a.nivell === 'avis'), s = estadistiques(o);
      return `<button class="card targeta" data-ruta="#/${ruta.vista}/${encodeURIComponent(o.id)}">
        <div class="t-cap"><b>${esc(o.client)}</b><span class="diners">${fmtDiners(o.import, app.amagat)}</span></div>
        <div class="t-nom">${esc(o.nom)}</div>
        <div class="t-meta">${o.numPressupost ? `Nº ${esc(o.numPressupost)} · ` : ''}${esc(o.material)}${s.unitats ? ` · ${s.unitats} elements` : ''}</div>
        <div class="barra-et">${ETAPES.map((_, i) => `<i class="${o.etapes[i] ? 'f' : i === act ? 'a' : ''}"></i>`).join('')}</div>
        <div class="t-et"><b>${o.etapes[11] ? 'Acabada' : esc(ETAPES[act])}</b><span>${o.etapes.filter(Boolean).length} de 12</span></div>
        <span class="pill ${te ? 'avis' : 'ok'}">${te ? '⚠' : '✓'} ${esc((av.find(a => a.nivell === 'avis') || av[0]).text)}</span>
      </button>`;
    }).join('')}</div>` : `<div class="card buit"><b>Cap ${ruta.vista === 'obres' ? 'obra' : 'particular'} de moment</b>Crea'n una amb el botó de dalt.</div>`);
}

// ---------------- Detall ----------------
function detall(ruta) {
  const o = app.obres.find(x => x.id === ruta.id);
  if (!o) return topbar('No trobada', { amagat: app.amagat, enrere: `#/${ruta.vista}` }) + '<div class="card buit"><b>Aquesta obra no existeix</b>Potser s\'ha esborrat.</div>';
  const pest = llegeixLocal('so.pestanya', 'elements');
  const act = etapaActual(o), s = estadistiques(o), av = avisos(o);
  const fotosN = (o.fotos || []).length;
  const bestretaTxt = o.tipusClient === 'Constructora' ? 'No cal (constructora)' : o.bestreta === 'cobrada' ? `Cobrada · ${fmtDiners((+o.import || 0) / 2, app.amagat)}` : `Pendent · ${fmtDiners((+o.import || 0) / 2, app.amagat)}`;

  const etapes = ETAPES.map((nom, i) => `<label class="et-fila ${o.etapes[i] ? 'feta' : i === act ? 'ara' : ''}">
      <input type="checkbox" data-etapa="${i}" ${o.etapes[i] ? 'checked' : ''}><span class="et-check">${o.etapes[i] ? '✓' : i + 1}</span>
      <span class="et-nom">${esc(nom)}</span><span class="et-data">${o.etapes[i] && o.datesEtapes?.[i] ? dataCurta(o.datesEtapes[i]) : i === act && !o.etapes[i] ? 'ara' : ''}</span></label>`).join('');

  const tabs = [['elements', 'Elements', (o.elements || []).length], ['comandes', 'Comandes', (o.comandes || []).length], ['remats', 'Remats', (o.remats || []).length], ['fotos', 'Fotos', fotosN], ['notes', 'Notes', '']];
  let cos = '';
  if (pest === 'elements') {
    cos = `<div class="els">${(o.elements || []).map((e, i) => {
      const f = campsQueFalten(e);
      return `<button class="card el" data-element="${i}">
        <div class="el-svg">${dibuixaElement(e, { W: 220, H: 140 })}</div>
        <div class="el-ref"><b>${esc(e.ref || e.tipus)}</b><span>${e.q > 1 ? `${e.q} u · ` : ''}${e.w ? `${e.w}${e.h ? ` × ${e.h}` : ''}` : ''}</span></div>
        <div class="el-meta">${esc([e.tipus, e.ubicacio, TIPUS_DIBUIXABLES.has(e.tipus) ? e.vidre : e.descripcio].filter(Boolean).join(' · '))}</div>
        ${f.length ? `<span class="pill avis">Falta: ${esc(f.join(', '))}</span>` : ''}</button>`;
    }).join('')}<button class="card el afegir" data-accio-o="nou-element">${ICONA.mes}<span>Afegir element</span><small>Finestra, porta, premarc, barana, pèrgola, tendal...</small></button></div>`;
  } else if (pest === 'comandes') {
    const est = { pendent: 'Per demanar', demanada: 'Demanada', rebuda: 'Rebuda' };
    cos = `<div class="barra-acc"><button class="btn prim" data-accio-o="genera">Generar des dels elements</button><button class="btn" data-accio-o="nova-comanda">+ Comanda a mà</button></div>
      ${(o.comandes || []).length ? `<div class="comandes">${o.comandes.map((c, i) => `<div class="card comanda">
        <div class="c-cap"><input class="inp c-cat" data-com="${i}" data-camp="categoria" value="${esc(c.categoria)}" aria-label="Categoria"><button class="btn icona petit" data-esborra-com="${i}" aria-label="Esborrar comanda">${ICONA.paperera}</button></div>
        <input class="inp" data-com="${i}" data-camp="proveidor" value="${esc(c.proveidor || '')}" placeholder="Proveïdor">
        ${(c.linies || []).length ? `<ul class="linies">${c.linies.map(l => `<li>${esc(l.text)}</li>`).join('')}</ul>` : ''}
        <div class="estats">${Object.entries(est).map(([k, t]) => `<button class="${c.estat === k ? 'on ' + k : ''}" data-com-estat="${i}" data-v="${k}">${t}</button>`).join('')}</div>
        <input class="inp" data-com="${i}" data-camp="notes" value="${esc(c.notes || '')}" placeholder="Notes (data prevista, nº de comanda...)"></div>`).join('')}</div>`
      : '<div class="card buit"><b>Encara no hi ha comandes</b>Prem «Generar des dels elements» i sortiran els vidres, persianes, perfil i material de cada element.</div>'}`;
  } else if (pest === 'remats') {
    cos = `<form class="card nou-remat" data-form="remat"><input class="inp" name="descripcio" placeholder="Què demana el client? (p. ex. xapa a l'ampit de la cuina)" required><button class="btn prim">Afegir remat</button></form>
      ${(o.remats || []).length ? `<div class="remats">${o.remats.map((r, i) => `<div class="card remat ${r.estat === 'fet' ? 'fet' : ''}">
        <button class="chk" data-remat-estat="${i}" aria-label="Marcar com a fet">${r.estat === 'fet' ? '✓' : ''}</button>
        <div><b>${esc(r.descripcio)}</b><span>${dataCurta(r.data)}${r.estat === 'fet' ? ` · fet ${dataCurta(r.dataFet)}` : ' · pendent'}</span></div>
        <button class="btn icona petit" data-esborra-remat="${i}" aria-label="Esborrar remat">${ICONA.paperera}</button></div>`).join('')}</div>`
      : '<div class="card buit"><b>Cap remat ni reparació pendent</b>Quan el client demani un remat, apunta\'l aquí perquè no s\'escapi.</div>'}`;
  } else if (pest === 'fotos') {
    cos = `<label class="card pujar">${ICONA.foto}<span><b>Afegir fotos</b> Des de l'ordinador o la càmera del mòbil</span>
      <input type="file" accept="image/*" multiple data-pujar-fotos hidden></label>
      <div class="galeria" id="galeria">${(o.fotos || []).map(f => `<div class="foto" data-foto="${f}"><img alt="Foto de l'obra" data-src="${f}"><button class="btn icona petit" data-esborra-foto="${f}" aria-label="Esborrar foto">${ICONA.paperera}</button></div>`).join('')}</div>`;
  } else {
    cos = `<div class="card"><textarea class="inp notes" data-notes placeholder="Notes de l'obra: el que s'ha parlat amb el client, accessos, horaris...">${esc(o.notes || '')}</textarea><p class="nota">Es desa sol quan surts del quadre.</p></div>`;
  }

  return topbar(`${o.client}`, {
    sub: o.nom, amagat: app.amagat, enrere: `#/${vistaDe(o)}`,
    accions: `<button class="btn" data-accio-o="edita-fitxa">${ICONA.editar}Editar fitxa</button><button class="btn perill icona" data-accio-o="esborra-obra" title="Esborrar obra" aria-label="Esborrar obra">${ICONA.paperera}</button>`,
  }) + `<div class="detall">
    <aside class="col-esq">
      <div class="card"><h3>Fet i pendent<span class="acc pill gris">${o.etapes.filter(Boolean).length} de 12</span></h3><div class="etapes">${etapes}</div></div>
      <div class="card"><h3>Avisos</h3>${av.map(a => `<div class="avis-l ${a.nivell}">${a.nivell === 'avis' ? '⚠' : '✓'} ${esc(a.text)}</div>`).join('')}</div>
    </aside>
    <section class="col-dreta">
      <div class="card fitxa"><dl>
        <div><dt>Client</dt><dd>${esc(o.client)}</dd></div>
        <div><dt>Telèfon</dt><dd>${o.telefon ? `<a href="tel:${esc(o.telefon)}">${esc(o.telefon)}</a>` : '—'}</dd></div>
        <div><dt>Tipus</dt><dd>${esc(o.tipusClient)} · ${esc(o.material)}</dd></div>
        <div><dt>Nº pressupost</dt><dd>${esc(o.numPressupost || '—')}</dd></div>
        <div><dt>Import</dt><dd class="diners">${fmtDiners(o.import, app.amagat, 2)}</dd></div>
        <div><dt>Bestreta 50%</dt><dd>${o.tipusClient === 'Particular' ? `<button class="pill ${o.bestreta === 'cobrada' ? 'ok' : 'avis'}" data-accio-o="bestreta" title="Clica per canviar">${bestretaTxt}</button>` : bestretaTxt}</dd></div>
        <div><dt>Data pressupost</dt><dd>${dataCurta(o.dataPressupost)}</dd></div>
        <div><dt>Muntatge previst</dt><dd>${dataCurta(o.muntatgePrevist)}</dd></div>
        <div class="ample"><dt>Adreça</dt><dd>${esc(o.adreca || '—')}</dd></div>
        ${o.carpeta ? `<div class="ample"><dt>Carpeta</dt><dd><button class="enllac" data-accio-o="copia-carpeta" title="Copiar la ruta per enganxar-la a l'explorador">${ICONA.carpeta}${esc(o.carpeta)}</button></dd></div>` : ''}
      </dl></div>
      <div class="xifres-obra">
        <div><b>${s.unitats}</b><span>Elements</span></div><div><b>${s.m2.toLocaleString('ca-ES')}</b><span>m² fusteria</span></div>
        <div><b>${s.m2Vidre.toLocaleString('ca-ES')}</b><span>m² vidre aprox.</span></div><div><b>${s.persianes}</b><span>Persianes</span></div>
        <div><b>${s.mosquiteres}</b><span>Mosquiteres</span></div><div><b>${fotosN}</b><span>Fotos</span></div>
      </div>
      <div class="pestanyes" role="tablist">${tabs.map(([k, t, n]) => `<button role="tab" class="${pest === k ? 'on' : ''}" data-pest="${k}">${t}${n !== '' ? `<span>${n}</span>` : ''}</button>`).join('')}</div>
      ${cos}
    </section></div>`;
}

// ---------------- Formulari de fitxa (nova o editar) ----------------
function formFitxa(o, { titol }) {
  return new Promise(res => {
    const d = document.createElement('dialog');
    const c = (nom, et, val, extra = '') => `<div class="camp"><label for="f-${nom}">${et}</label><input class="inp" id="f-${nom}" name="${nom}" value="${esc(val ?? '')}" ${extra}></div>`;
    d.innerHTML = `<form method="dialog"><div class="dlg-cap">${esc(titol)}</div><div class="dlg-cos">
      <div class="graella g2">${c('client', 'Client', o.client, 'required autofocus')}${c('nom', 'Obra / descripció', o.nom, 'required')}</div>
      <div class="graella g2">
        <div class="camp"><label>Tipus de client</label><div class="opts">${['Particular', 'Constructora'].map(t => `<button type="button" class="opt ${o.tipusClient === t ? 'on' : ''}" data-v-tipus="${t}">${t}</button>`).join('')}</div></div>
        <div class="camp"><label>Material</label><div class="opts">${['Alumini', 'PVC', 'Ferro', 'Altres'].map(t => `<button type="button" class="opt ${o.material === t ? 'on' : ''}" data-v-mat="${t}">${t}</button>`).join('')}</div></div>
      </div>
      <div class="graella g3">${c('telefon', 'Telèfon', o.telefon, 'inputmode="tel"')}${c('numPressupost', 'Nº pressupost', o.numPressupost)}<div class="camp"><label for="f-import">Import total (€)</label><input class="inp" id="f-import" name="import" type="number" step="0.01" min="0" ${atributsDiners(o.import, app.amagat)}></div></div>
      <div class="graella g3">${c('dataPressupost', 'Data pressupost', o.dataPressupost?.slice(0, 10), 'type="date"')}${c('muntatgePrevist', 'Muntatge previst', o.muntatgePrevist?.slice(0, 10), 'type="date"')}
        <div class="camp"><label for="f-bestreta">Bestreta 50%</label><select class="inp" id="f-bestreta" name="bestreta">${['pendent', 'cobrada', 'no cal'].map(v => `<option ${o.bestreta === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
      ${c('adreca', 'Adreça de l\'obra', o.adreca)}
      ${c('carpeta', 'Carpeta al Z: (opcional)', o.carpeta)}
    </div><div class="dlg-peu"><button type="button" class="btn" data-cancela>Cancel·lar</button><button class="btn prim">Desar</button></div></form>`;
    const val = { tipusClient: o.tipusClient, material: o.material };
    d.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.vTipus) { val.tipusClient = b.dataset.vTipus; b.parentElement.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); }
      if (b.dataset.vMat) { val.material = b.dataset.vMat; b.parentElement.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); }
      if (b.hasAttribute('data-cancela')) d.close();
    });
    d.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(d.querySelector('form'));
      const dades = Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v).trim()]));
      // Si l'import està amagat (camp desactivat) no arriba al formulari: es conserva el que hi havia
      if (!('import' in dades)) dades.import = o.import ?? null;
      else dades.import = dades.import === '' ? null : +dades.import;
      if (val.tipusClient === 'Constructora') dades.bestreta = 'no cal';
      d._res = { ...dades, ...val }; d.close();
    });
    d.addEventListener('close', () => { res(d._res || null); d.remove(); });
    document.body.append(d); d.showModal();
  });
}

export async function novaObraDialeg(tipus = 'Particular') {
  const base = novaObra({ tipusClient: tipus, bestreta: tipus === 'Constructora' ? 'no cal' : 'pendent' });
  base.etapes[0] = true; base.datesEtapes[0] = new Date().toISOString();
  const dades = await formFitxa(base, { titol: 'Nova obra' });
  if (!dades) return;
  const o = { ...base, ...dades };
  await desaObra(o);
  toast(`Obra creada: ${o.client}`);
  navega(`#/${vistaDe(o)}/${encodeURIComponent(o.id)}`);
}

// ---------------- Esdeveniments del detall ----------------
async function carregaFotos(arrel) {
  for (const img of arrel.querySelectorAll('img[data-src]')) img.src = await fotoURL(img.dataset.src);
}

function despres(arrel, ruta) {
  if (!ruta.id) return;
  const o = app.obres.find(x => x.id === ruta.id);
  if (!o) return;
  const desaIRefresca = async (msg) => { await desaObra(o); if (msg) toast(msg); refresca(); };
  carregaFotos(arrel);

  arrel.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset.etapa != null) {
      const i = +t.dataset.etapa;
      o.etapes[i] = t.checked;
      o.datesEtapes ||= Array(12).fill(null);
      o.datesEtapes[i] = t.checked ? new Date().toISOString() : null;
      return desaIRefresca(`${ETAPES[i]}: ${t.checked ? 'feta' : 'pendent'}`);
    }
    if (t.dataset.com != null) { o.comandes[+t.dataset.com][t.dataset.camp] = t.value.trim(); await desaObra(o); toast('Comanda desada'); return; }
    if (t.hasAttribute('data-notes')) { o.notes = t.value; await desaObra(o); toast('Notes desades'); return; }
    if (t.hasAttribute('data-pujar-fotos')) {
      const fitxers = [...t.files];
      toast(`Desant ${fitxers.length} foto${fitxers.length > 1 ? 's' : ''}...`);
      for (const f of fitxers) {
        const blob = await comprimeixFoto(f).catch(() => f);
        const id = await desaFoto(blob, { obraId: o.id, nom: f.name });
        (o.fotos ||= []).push(id);
      }
      return desaIRefresca(`${fitxers.length} foto${fitxers.length > 1 ? 's' : ''} afegida${fitxers.length > 1 ? 'es' : ''}`);
    }
  });
  arrel.addEventListener('focusout', async e => {
    if (e.target.hasAttribute?.('data-notes') && e.target.value !== o.notes) { o.notes = e.target.value; await desaObra(o); toast('Notes desades'); }
  });
  arrel.addEventListener('submit', async e => {
    if (e.target.dataset.form !== 'remat') return;
    e.preventDefault();
    const desc = new FormData(e.target).get('descripcio').trim();
    if (!desc) return;
    (o.remats ||= []).push({ id: uid(), descripcio: desc, data: new Date().toISOString(), estat: 'pendent' });
    desaIRefresca('Remat afegit');
  });
  arrel.addEventListener('click', async e => {
    const b = e.target.closest('button, .foto img'); if (!b) return;
    const d = b.dataset;
    if (d.pest) { guardaLocal('so.pestanya', d.pest); return refresca(); }
    if (d.element != null) {
      const i = +d.element;
      const r = await editaElement(o.elements[i], { titol: 'Editar' });
      if (r.accio === 'desa') { o.elements[i] = r.element; return desaIRefresca('Element desat'); }
      if (r.accio === 'duplica') { o.elements.splice(i + 1, 0, { ...r.element, id: uid(), ref: (r.element.ref || '') + ' (còpia)' }); return desaIRefresca('Element duplicat'); }
      if (r.accio === 'esborra' && await confirma(`Esborrar l'element ${o.elements[i].ref || o.elements[i].tipus}?`)) { o.elements.splice(i, 1); return desaIRefresca('Element esborrat'); }
      return;
    }
    if (d.comEstat != null) { const c = o.comandes[+d.comEstat]; c.estat = d.v; c[`data_${d.v}`] = new Date().toISOString(); return desaIRefresca(`${c.categoria}: ${b.textContent.toLowerCase()}`); }
    if (d.esborraCom != null) { const c = o.comandes[+d.esborraCom]; if (await confirma(`Esborrar la comanda «${c.categoria}»?`)) { o.comandes.splice(+d.esborraCom, 1); desaIRefresca('Comanda esborrada'); } return; }
    if (d.rematEstat != null) { const r = o.remats[+d.rematEstat]; r.estat = r.estat === 'fet' ? 'pendent' : 'fet'; r.dataFet = r.estat === 'fet' ? new Date().toISOString() : null; return desaIRefresca(r.estat === 'fet' ? 'Remat fet' : 'Remat pendent'); }
    if (d.esborraRemat != null) { if (await confirma('Esborrar aquest remat?')) { o.remats.splice(+d.esborraRemat, 1); desaIRefresca('Remat esborrat'); } return; }
    if (d.esborraFoto) {
      e.stopPropagation();
      if (await confirma('Esborrar aquesta foto? No es pot desfer.')) { await esborraFoto(d.esborraFoto); o.fotos = o.fotos.filter(x => x !== d.esborraFoto); desaIRefresca('Foto esborrada'); }
      return;
    }
    if (b.matches('.foto img')) { mostraFoto(b.src); return; }
    switch (d.accioO) {
      case 'nou-element': {
        const n = (o.elements || []).length + 1;
        const r = await editaElement({ id: '', ref: `E${String(n).padStart(2, '0')}`, tipus: 'Finestra', q: 1, parts: ['Practicable E'], color: o.elements?.at(-1)?.color || '', serie: o.elements?.at(-1)?.serie || '' }, { titol: 'Nou element' });
        if (r.accio === 'desa') { (o.elements ||= []).push({ ...r.element, id: uid() }); desaIRefresca('Element afegit'); }
        break;
      }
      case 'genera': {
        if (!(o.elements || []).length) { toast('Primer afegeix els elements de l\'obra'); break; }
        const noves = comandesDesDElements(o.elements);
        const ja = new Set((o.comandes || []).map(c => c.categoria));
        const afegir = noves.filter(c => !ja.has(c.categoria));
        o.comandes = [...(o.comandes || []), ...afegir];
        desaIRefresca(afegir.length ? `${afegir.length} comandes generades` : 'Ja hi eren totes; no se n\'ha afegit cap');
        break;
      }
      case 'nova-comanda': (o.comandes ||= []).push({ id: uid(), categoria: 'Nova comanda', proveidor: '', estat: 'pendent', notes: '', linies: [] }); desaIRefresca(); break;
      case 'bestreta': o.bestreta = o.bestreta === 'cobrada' ? 'pendent' : 'cobrada'; desaIRefresca(`Bestreta ${o.bestreta}`); break;
      case 'copia-carpeta': navigator.clipboard?.writeText(o.carpeta).then(() => toast('Ruta copiada: enganxa-la a l\'explorador')); break;
      case 'edita-fitxa': {
        const dades = await formFitxa(o, { titol: 'Editar fitxa' });
        if (dades) { const abans = vistaDe(o); Object.assign(o, dades); await desaObra(o); toast('Fitxa desada'); if (abans !== vistaDe(o)) navega(`#/${vistaDe(o)}/${encodeURIComponent(o.id)}`); else refresca(); }
        break;
      }
      case 'esborra-obra':
        if (await confirma(`Esborrar l'obra «${o.client} — ${o.nom}» amb tots els seus elements, comandes i fotos? No es pot desfer.`)) {
          for (const f of o.fotos || []) await esborraFoto(f);
          await esborra('obres', o.id);
          app.obres = app.obres.filter(x => x.id !== o.id);
          toast('Obra esborrada');
          navega(`#/${vistaDe(o)}`);
        }
        break;
    }
  });
}

function mostraFoto(src) {
  const d = document.createElement('dialog');
  d.className = 'dlg-foto';
  d.innerHTML = `<img src="${src}" alt="Foto"><button class="btn" aria-label="Tancar">Tancar</button>`;
  d.addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal();
}

// Botó global «Nova obra» (Inici i llistes)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-accio="nova-obra"]');
  if (b) novaObraDialeg(b.dataset.tipus || 'Particular');
});

for (const v of ['obres', 'particulars']) registraVista(v, ruta => (ruta.id ? detall(ruta) : llista(ruta)), despres);
