// Configuració: còpia de seguretat, preu/hora i obres noves del Z:
import { app, registraVista, refresca } from '../main.js';
import { topbar } from './shell.js';
import { esc, toast, confirma, dataCurta } from '../util.js';
import { exportaTot, importaTot, obte, desa } from '../db.js';
import { obresNoves } from '../seed.js';
import { recarregaDades, desaObra } from './arrencada.js';
import { configSincro, connecta, desconnecta, sincronitza } from './sincronitza.js';

async function render() {
  const preu = (await obte('config', 'preuHora'))?.valor ?? 35;
  const ultima = (await obte('config', 'ultimaCopia'))?.data;
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const mb = est ? (est.usage / 1e6).toFixed(1) : '?';
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const sc = await configSincro();
  const hora = d => d ? new Date(d).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'mai';
  const sincro = sc ? `<section class="card"><h3>Sincronització mòbil ↔ ordinador</h3>
      <p class="nota">Connectat com a <b>${esc(sc.email)}</b>. Els canvis es passen sols a l'altre aparell quan hi ha connexió (també funciona sense: s'envia en tornar a tenir cobertura). Les fotos, de moment, es queden a l'aparell on es fan.</p>
      <p class="nota">Darrera sincronització: <b>${hora(sc.darrera)}</b>${sc.error ? ` · <span style="color:var(--perill,#c0392b)">${esc(sc.error)}</span>` : ''}</p>
      <div class="barra-acc"><button class="btn prim" data-cfg="sincro-ara">Sincronitzar ara</button><button class="btn" data-cfg="sincro-surt">Desconnectar</button></div></section>`
    : `<section class="card"><h3>Sincronització mòbil ↔ ordinador</h3>
      <p class="nota">Per tenir les mateixes obres al mòbil i a l'ordinador sense passar fitxers. Omple-ho tu amb les dades del teu compte de Supabase (a l'ordinador i al mòbil, les mateixes). La contrasenya no es desa.</p>
      <form data-cfg-sincro class="graella-sincro">
        <div class="camp"><label for="sc-url">Adreça del projecte (Project URL)</label><input class="inp" id="sc-url" name="url" type="url" required autocomplete="off" placeholder="https://xxxx.supabase.co"></div>
        <div class="camp"><label for="sc-clau">Clau pública (anon / publishable key)</label><input class="inp" id="sc-clau" name="clau" required autocomplete="off"></div>
        <div class="camp"><label for="sc-email">Correu de l'usuari</label><input class="inp" id="sc-email" name="email" type="email" required autocomplete="username"></div>
        <div class="camp"><label for="sc-pass">Contrasenya de l'usuari</label><input class="inp" id="sc-pass" name="contrasenya" type="password" required autocomplete="current-password"></div>
        <div class="barra-acc"><button class="btn prim" type="submit">Connectar</button></div>
      </form></section>`;
  return topbar('Configuració', { amagat: app.amagat }) + `<div class="config">
    ${sincro}
    <section class="card"><h3>Còpia de seguretat</h3>
      <p class="nota">Les dades es desen en aquest ${local ? 'ordinador' : 'dispositiu'}, dins de l'app (${mb} MB ara mateix). Fes una còpia de tant en tant${local ? ' i guarda-la al Z: o a un llapis USB' : ' i envia-te-la (WhatsApp, correu o Archivos)'}. Per passar les dades d'un aparell a un altre: descarrega la còpia en un i restaura-la a l'altre.</p>
      <p class="nota">Última còpia: <b>${ultima ? dataCurta(ultima) : 'mai'}</b></p>
      <div class="barra-acc"><button class="btn prim" data-cfg="exporta">Descarregar còpia</button>
      <label class="btn">Restaurar una còpia<input type="file" accept="application/json,.json" hidden data-cfg-importa></label></div></section>
    <section class="card"><h3>Reparacions</h3>
      <div class="camp" style="max-width:220px"><label for="cfg-preu">Preu per hora per defecte (€)</label><input class="inp" type="number" step="0.5" min="0" id="cfg-preu" value="${esc(preu)}"></div></section>
    ${local ? `<section class="card"><h3>Obres del Z:</h3>
      <p class="nota">Per portar les obres acceptades noves: obre <b>«Actualitzar obres del Z.bat»</b> (a la carpeta SEGUIMENT OBRES) i després prem aquest botó. Només s'afegeixen les que encara no hi són; no es toca res del Z:.</p>
      <div class="barra-acc"><button class="btn" data-cfg="z">Afegir obres noves del Z:</button></div></section>` : ''}
    <section class="card"><h3>Instal·lar com a app</h3>
      <p class="nota">${/iPhone|iPad/.test(navigator.userAgent)
        ? 'A l\'iPhone: obre-la amb Safari, prem Compartir (el quadrat amb la fletxa) → «Añadir a pantalla de inicio». Obre-la sempre des d\'aquesta icona.'
        : 'A Chrome o Edge, prem la icona d\'instal·lar de la barra d\'adreces (o el menú ⋮ → «Instal·lar Seguiment d\'Obres»). Així s\'obre en una finestra pròpia, com un programa.'}</p></section>
  </div>`;
}

function despres(arrel) {
  arrel.addEventListener('submit', async e => {
    if (!e.target.hasAttribute('data-cfg-sincro')) return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    toast('Connectant...');
    try { const r = await connecta(d); toast(`Connectat. ${r?.rebudes || 0} canvis rebuts, ${r?.enviades || 0} enviats`); refresca(); }
    catch (err) { toast(err.message || "No s'ha pogut connectar"); }
  });
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
    if (b.dataset.cfg === 'sincro-ara') {
      toast('Sincronitzant...');
      try { const r = await sincronitza(); toast(r ? `Fet: ${r.rebudes} rebuts, ${r.enviades} enviats` : 'Sense connexió'); } catch (err) { toast(err.message); }
      refresca();
    }
    if (b.dataset.cfg === 'sincro-surt' && await confirma("Desconnectar aquest aparell del núvol? Les dades d'aquí no s'esborren.", { boto: 'Desconnectar' })) { await desconnecta(); refresca(); }
    if (b.dataset.cfg === 'z') {
      const { afegeixNovesDelZ } = await import('./arrencada.js');
      const n = await afegeixNovesDelZ({ avisa: false });
      toast(n ? `${n} obres noves afegides` : 'No hi ha obres noves al Z:');
      refresca();
    }
  });
}

registraVista('config', render, despres);
