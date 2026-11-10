// Configuració: còpia de seguretat, preu/hora i obres noves del Z:
import { app, registraVista, refresca } from '../main.js';
import { topbar } from './shell.js';
import { esc, toast, confirma, dataCurta } from '../util.js';
import { exportaTot, importaTot, obte, desa } from '../db.js';
import { obresNoves } from '../seed.js';
import { recarregaDades, desaObra } from './arrencada.js';

async function render() {
  const preu = (await obte('config', 'preuHora'))?.valor ?? 35;
  const ultima = (await obte('config', 'ultimaCopia'))?.data;
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const mb = est ? (est.usage / 1e6).toFixed(1) : '?';
  return topbar('Configuració', { amagat: app.amagat }) + `<div class="config">
    <section class="card"><h3>Còpia de seguretat</h3>
      <p class="nota">Les dades es desen en aquest ordinador, dins del navegador (${mb} MB ara mateix). Fes una còpia de tant en tant i guarda-la al Z: o a un llapis USB.</p>
      <p class="nota">Última còpia: <b>${ultima ? dataCurta(ultima) : 'mai'}</b></p>
      <div class="barra-acc"><button class="btn prim" data-cfg="exporta">Descarregar còpia</button>
      <label class="btn">Restaurar una còpia<input type="file" accept="application/json,.json" hidden data-cfg-importa></label></div></section>
    <section class="card"><h3>Reparacions</h3>
      <div class="camp" style="max-width:220px"><label for="cfg-preu">Preu per hora per defecte (€)</label><input class="inp" type="number" step="0.5" min="0" id="cfg-preu" value="${esc(preu)}"></div></section>
    <section class="card"><h3>Obres del Z:</h3>
      <p class="nota">Per portar les obres acceptades noves: obre <b>«Actualitzar obres del Z.bat»</b> (a la carpeta SEGUIMENT OBRES) i després prem aquest botó. Només s'afegeixen les que encara no hi són; no es toca res del Z:.</p>
      <div class="barra-acc"><button class="btn" data-cfg="z">Afegir obres noves del Z:</button></div></section>
    <section class="card"><h3>Instal·lar com a programa</h3>
      <p class="nota">A Chrome o Edge, prem la icona d'instal·lar de la barra d'adreces (o el menú ⋮ → «Instal·lar Seguiment d'Obres»). Així s'obre en una finestra pròpia, com un programa.</p></section>
  </div>`;
}

function despres(arrel) {
  arrel.addEventListener('change', async e => {
    if (e.target.id === 'cfg-preu') { await desa('config', { id: 'preuHora', valor: +e.target.value || 0 }); toast('Preu per hora desat'); }
    if (e.target.hasAttribute('data-cfg-importa')) {
      const f = e.target.files[0]; if (!f) return;
      if (!await confirma('Restaurar aquesta còpia? Les obres i reparacions de la còpia substituiran les que tinguin el mateix identificador.', { boto: 'Restaurar', perill: false })) return;
      try { const r = await importaTot(f); await recarregaDades(); toast(`Restaurat: ${r.obres} obres, ${r.reparacions} reparacions, ${r.fotos} fotos`); refresca(); }
      catch (err) { toast(err.message || 'No s\'ha pogut llegir la còpia'); }
    }
  });
  arrel.addEventListener('click', async e => {
    const b = e.target.closest('[data-cfg]'); if (!b) return;
    if (b.dataset.cfg === 'exporta') {
      toast('Preparant la còpia...');
      const blob = await exportaTot();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `seguiment-obres-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      await desa('config', { id: 'ultimaCopia', data: new Date().toISOString() });
      refresca();
    }
    if (b.dataset.cfg === 'z') {
      const resp = await fetch('data/obres-inicials.json', { cache: 'no-store' }).catch(() => null);
      if (!resp?.ok) { toast('No trobo el fitxer d\'obres. Obre primer «Actualitzar obres del Z.bat».'); return; }
      const noves = obresNoves(app.obres, await resp.json());
      for (const o of noves) await desaObra(o);
      toast(noves.length ? `${noves.length} obres noves afegides` : 'No hi ha obres noves al Z:');
      refresca();
    }
  });
}

registraVista('config', render, despres);
