// Reparacions: hores invertides, material invertit, què es repara i valoració econòmica
import { app, registraVista, refresca, navega } from '../main.js';
import { topbar } from './shell.js';
import { esc, toast, confirma, dataCurta, guardaLocal, llegeixLocal, atributsDiners } from '../util.js';
import { totalReparacio, fmtDiners, ordenaReparacions, reparacioFinalitzada } from '../model.js';
import { desaReparacio } from './arrencada.js';
import { esborra, obte, desaFoto, fotoURL, esborraFoto } from '../db.js';
import { comprimeixFoto, fotosAEsborrar } from '../fotos.js';
import { ICONA } from './icones.js';

const ESTATS = { pendent: 'Pendent', feta: 'Feta', facturada: 'Facturada' };
const valoracio = r => (r.valoracio != null && r.valoracio !== '' ? +r.valoracio : totalReparacio(r).total);

export async function preuHoraPerDefecte() {
  return (await obte('config', 'preuHora'))?.valor ?? 35;
}

function llista(ruta) {
  const fin = ruta?.id === 'finalitzades';
  const reps = ordenaReparacions(app.reparacions);
  const nFin = reps.filter(reparacioFinalitzada).length, nEnCurs = reps.length - nFin;
  const vis = reps.filter(r => reparacioFinalitzada(r) === fin);
  const tot = vis.reduce((a, r) => { const t = totalReparacio(r); a.h += +r.hores || 0; a.mo += t.maObra; a.mat += t.material; a.v += valoracio(r); return a; }, { h: 0, mo: 0, mat: 0, v: 0 });
  const D = (v) => fmtDiners(v, app.amagat, 2);
  return topbar(fin ? 'Reparacions finalitzades' : 'Reparacions en curs', { sub: `${vis.length}`, amagat: app.amagat, accions: '<button class="btn prim" data-accio-r="nova">+ Nova reparació</button>' }) + `
  <div class="segment"><button class="${fin ? '' : 'on'}" data-ruta="#/reparacions">En curs<span>${nEnCurs}</span></button><button class="${fin ? 'on' : ''}" data-ruta="#/reparacions/finalitzades">Finalitzades<span>${nFin}</span></button></div>
  ${vis.length ? `<div class="card taula-wrap"><table class="taula-rep">
    <thead><tr><th>Data</th><th>Client / obra</th><th>Ubicació</th><th>Telèfon</th><th>Què es repara</th><th class="n">Hores</th><th class="n">Mà d'obra</th><th class="n">Material</th><th class="n">Valoració</th><th>Estat</th></tr></thead>
    <tbody>${vis.map(r => { const t = totalReparacio(r); return `<tr data-rep="${r.id}">
      <td>${dataCurta(r.data)}</td><td><b>${esc(r.client || '—')}</b>${r.obraNom ? `<span class="sub-t">${esc(r.obraNom)}</span>` : ''}</td>
      <td class="ubi">${esc(r.ubicacio || '—')}</td>
      <td class="tel">${r.telefon ? `<a href="tel:${esc(r.telefon)}" data-no-obrir>${esc(r.telefon)}</a>` : '—'}</td>
      <td class="que">${esc(r.que || '')}</td><td class="n">${(+r.hores || 0).toLocaleString('ca-ES')} h</td>
      <td class="n diners">${D(t.maObra)}</td><td class="n diners">${D(t.material)}</td><td class="n diners fort">${D(valoracio(r))}</td>
      <td><span class="pill ${r.estat === 'pendent' ? 'avis' : r.estat === 'feta' ? 'blau' : 'ok'}">${ESTATS[r.estat] || r.estat}</span></td></tr>`; }).join('')}</tbody>
    <tfoot><tr><td colspan="5">Total (${vis.length})</td><td class="n">${tot.h.toLocaleString('ca-ES')} h</td><td class="n diners">${D(tot.mo)}</td><td class="n diners">${D(tot.mat)}</td><td class="n diners fort">${D(tot.v)}</td><td></td></tr></tfoot>
  </table></div>` : '<div class="card buit"><b>Cap reparació</b>Apunta aquí cada reparació: què s\'ha reparat, les hores, el material i la valoració.</div>'}`;
}

function formulari(r, { titol }) {
  return new Promise(res => {
    const rep = structuredClone(r);
    rep.materials ||= [];
    const canvisFotos = { noves: [], treure: [] };
    const d = document.createElement('dialog');
    d.className = 'dlg-rep';
    const clients = [...new Set(app.obres.map(o => o.client))].sort();
    const pinta = () => {
      const t = totalReparacio(rep);
      const D = v => fmtDiners(v, app.amagat, 2);
      d.innerHTML = `<form><div class="dlg-cap">${esc(titol)}</div><div class="dlg-cos">
        <div class="graella g3">
          <div class="camp"><label for="r-data">Data</label><input class="inp" type="date" id="r-data" name="data" value="${esc((rep.data || '').slice(0, 10))}"></div>
          <div class="camp"><label for="r-client">Client</label><input class="inp" id="r-client" name="client" list="dl-clients" value="${esc(rep.client || '')}" required></div>
          <div class="camp"><label for="r-obra">Obra (opcional)</label><select class="inp" id="r-obra" name="obraId"><option value="">— Cap —</option>${app.obres.filter(o => !rep.client || o.client === rep.client).map(o => `<option value="${o.id}" ${rep.obraId === o.id ? 'selected' : ''}>${esc(o.client)} · ${esc(o.nom)}</option>`).join('')}</select></div>
        </div>
        <div class="graella g2">
          <div class="camp"><label for="r-ubicacio">Ubicació</label><input class="inp" id="r-ubicacio" name="ubicacio" value="${esc(rep.ubicacio || '')}" placeholder="Població, adreça, nau..."></div>
          <div class="camp"><label for="r-telefon">Telèfon</label><input class="inp" id="r-telefon" name="telefon" inputmode="tel" value="${esc(rep.telefon || '')}" placeholder="600 000 000"></div>
        </div>
        <div class="camp"><label for="r-que">Què es repara</label><textarea class="inp" id="r-que" name="que" required placeholder="Ajustar fulla del bany, canviar cinta de persiana...">${esc(rep.que || '')}</textarea></div>
        <div class="graella g3">
          <div class="camp"><label for="r-hores">Hores invertides</label><input class="inp" type="number" step="0.25" min="0" id="r-hores" name="hores" value="${esc(rep.hores ?? '')}"></div>
          <div class="camp"><label for="r-preu">Preu/hora (€)</label><input class="inp" type="number" step="0.5" min="0" id="r-preu" name="preuHora" ${atributsDiners(rep.preuHora, app.amagat)}></div>
          <div class="camp"><label>Mà d'obra</label><div class="calc diners">${D(t.maObra)}</div></div>
        </div>
        <div class="camp"><label>Material invertit</label>
          <table class="mat-t"><thead><tr><th>Descripció</th><th>Quantitat</th><th>Preu unitari (€)</th><th class="n">Import</th><th></th></tr></thead><tbody>
          ${rep.materials.map((m, i) => `<tr><td><input class="inp" data-mat="${i}" data-c="desc" value="${esc(m.desc || '')}" placeholder="Cinta persiana, frontissa..."></td>
            <td><input class="inp" type="number" step="0.01" min="0" data-mat="${i}" data-c="q" value="${esc(m.q ?? '')}"></td>
            <td><input class="inp" type="number" step="0.01" min="0" data-mat="${i}" data-c="preu" ${atributsDiners(m.preu, app.amagat)}></td>
            <td class="n diners">${D((+m.q || 0) * (+m.preu || 0))}</td>
            <td><button type="button" class="btn icona petit" data-treu-mat="${i}" aria-label="Treure material">${ICONA.paperera}</button></td></tr>`).join('')}
          </tbody></table><button type="button" class="btn petit" data-afegir-mat>+ Afegir material</button></div>
        <div class="graella g3 totals-rep">
          <div class="camp"><label>Material</label><div class="calc diners">${D(t.material)}</div></div>
          <div class="camp"><label>Total calculat</label><div class="calc diners fort">${D(t.total)}</div></div>
          <div class="camp"><label for="r-val">Valoració econòmica (€)</label><input class="inp" type="number" step="0.01" min="0" id="r-val" name="valoracio" ${app.amagat ? atributsDiners(null, true) : `value="${esc(rep.valoracio ?? '')}" placeholder="${t.total.toFixed(2)}"`}></div>
        </div>
        <div class="camp"><label>Estat</label><div class="opts">${Object.entries(ESTATS).map(([k, v]) => `<button type="button" class="opt ${rep.estat === k ? 'on' : ''}" data-estat="${k}">${v}</button>`).join('')}</div></div>
        <div class="camp"><label>Fotos</label><div class="galeria petita">${(rep.fotos || []).map(f => `<div class="foto"><img data-src="${f}" alt="Foto de la reparació"><button type="button" class="btn icona petit" data-treu-foto="${f}" aria-label="Esborrar foto">${ICONA.paperera}</button></div>`).join('')}
          <label class="foto afegir-f">${ICONA.foto}<input type="file" accept="image/*" multiple hidden data-fotos-rep></label></div></div>
        <datalist id="dl-clients">${clients.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      </div><div class="dlg-peu">
        ${r.id ? '<button type="button" class="btn perill" data-esborra-rep style="margin-right:auto">Esborrar</button>' : ''}
        <button type="button" class="btn" data-cancela>Cancel·lar</button><button class="btn prim">Desar</button></div></form>`;
      d.querySelectorAll('img[data-src]').forEach(async img => { img.src = await fotoURL(img.dataset.src); });
    };
    const llegeix = () => {
      const f = d.querySelector('form');
      for (const k of ['data', 'client', 'obraId', 'que', 'ubicacio', 'telefon']) rep[k] = f.elements[k].value.trim();
      // Els camps de diners desactivats (ull tancat) no es llegeixen: es conserva el valor desat
      for (const k of ['hores', 'preuHora']) if (!f.elements[k].disabled) rep[k] = f.elements[k].value === '' ? '' : +f.elements[k].value;
      if (!f.elements.valoracio.disabled) rep.valoracio = f.elements.valoracio.value === '' ? null : +f.elements.valoracio.value;
      d.querySelectorAll('[data-mat]').forEach(i => { if (i.disabled) return; const m = rep.materials[+i.dataset.mat]; m[i.dataset.c] = i.dataset.c === 'desc' ? i.value : (i.value === '' ? '' : +i.value); });
      const o = app.obres.find(x => x.id === rep.obraId); rep.obraNom = o ? o.nom : '';
    };
    pinta();
    d.addEventListener('change', async e => {
      if (e.target.name === 'client') { llegeix(); pinta(); d.querySelector('#r-client').focus(); return; }
      if (e.target.name === 'obraId') {
        // En triar una obra, s'omplen telèfon i ubicació si encara són buits
        llegeix();
        const o = app.obres.find(x => x.id === rep.obraId);
        if (o) { rep.telefon ||= o.telefon || ''; rep.ubicacio ||= o.adreca || ''; }
        pinta(); return;
      }
      if (e.target.hasAttribute('data-fotos-rep')) {
        llegeix();
        for (const f of e.target.files) { const blob = await comprimeixFoto(f).catch(() => f); const fid = await desaFoto(blob, { reparacioId: rep.id }); (rep.fotos ||= []).push(fid); canvisFotos.noves.push(fid); }
        pinta(); return;
      }
      if (['hores', 'preuHora'].includes(e.target.name) || e.target.dataset.mat != null) { const foc = e.target.id || null; llegeix(); pinta(); if (foc) d.querySelector('#' + foc)?.focus(); }
    });
    d.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-afegir-mat')) { llegeix(); rep.materials.push({ desc: '', q: 1, preu: '' }); pinta(); d.querySelector(`[data-mat="${rep.materials.length - 1}"][data-c="desc"]`)?.focus(); }
      else if (b.dataset.treuMat != null) { llegeix(); rep.materials.splice(+b.dataset.treuMat, 1); pinta(); }
      else if (b.dataset.estat) { llegeix(); rep.estat = b.dataset.estat; pinta(); }
      else if (b.dataset.treuFoto) {
        const fid = b.dataset.treuFoto;
        if (!await confirma('Treure aquesta foto de la reparació? (No s\'esborra fins que premis Desar)', { boto: 'Treure' })) return;
        llegeix(); canvisFotos.treure.push(fid); rep.fotos = rep.fotos.filter(x => x !== fid); pinta();
      }
      else if (b.hasAttribute('data-cancela')) d.close();
      else if (b.hasAttribute('data-esborra-rep')) { if (await confirma('Esborrar aquesta reparació? No es pot desfer.')) { d._res = { accio: 'esborra' }; d.close(); } }
    });
    d.addEventListener('submit', e => { e.preventDefault(); llegeix(); rep.materials = rep.materials.filter(m => m.desc || +m.preu); d._res = { accio: 'desa', rep }; d.close(); });
    d.addEventListener('close', async () => {
      const r = d._res || { accio: 'cancela' };
      // Desar: s'esborren les fotos tretes. Cancel·lar o esborrar: s'esborren les fotos noves que no s'han desat.
      for (const fid of fotosAEsborrar(r.accio === 'desa' ? 'desa' : 'cancela', canvisFotos)) await esborraFoto(fid).catch(() => {});
      res(r); d.remove();
    });
    document.body.append(d); d.showModal();
  });
}

async function obre(rep) {
  const r = await formulari(rep, { titol: rep.creada ? 'Editar reparació' : 'Nova reparació' });
  if (r.accio === 'desa') { r.rep.creada ||= new Date().toISOString(); await desaReparacio(r.rep); toast('Reparació desada'); refresca(); }
  if (r.accio === 'esborra') {
    for (const f of rep.fotos || []) await esborraFoto(f);
    await esborra('reparacions', rep.id); app.reparacions = app.reparacions.filter(x => x.id !== rep.id);
    toast('Reparació esborrada'); navega('#/reparacions');
  }
}

export async function novaReparacio(dades = {}) {
  obre({ id: crypto.randomUUID(), data: new Date().toISOString().slice(0, 10), client: '', obraId: '', que: '', hores: '', preuHora: await preuHoraPerDefecte(), materials: [], valoracio: null, estat: 'pendent', fotos: [], ...dades });
}

function despres(arrel, ruta) {
  arrel.addEventListener('click', e => {
    const f = e.target.closest('[data-filtre-r]');
    if (f) { guardaLocal('so.filtreRep', f.dataset.filtreR); refresca(); return; }
    if (e.target.closest('[data-accio-r="nova"]')) { novaReparacio(); return; }
    if (e.target.closest('[data-no-obrir]')) return;
    const tr = e.target.closest('tr[data-rep]');
    if (tr) obre(app.reparacions.find(r => r.id === tr.dataset.rep));
  });
  if (ruta.id && ruta.id !== 'finalitzades') { const r = app.reparacions.find(x => x.id === ruta.id); if (r) obre(r); }
}

registraVista('reparacions', llista, despres);
