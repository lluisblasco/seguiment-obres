// Lògica de negoci de Seguiment d'Obres (sense dependències del navegador)

export const ETAPES = ['Contacte', 'Reunió', 'Presa de mides', 'Pressupost enviat', 'Pressupost acceptat', 'Comandes',
  'Material rebut', 'Fulla de fabricació', 'Fabricació', 'Càrrega', 'Muntatge', 'Acabada'];
export const ETAPES_CURT = ['Cont.', 'Reun.', 'Mides', 'Press.', 'Acc.', 'Com.', 'Rebut', 'Fulla', 'Fabr.', 'Càrr.', 'Munt.', 'Fi'];

export const TIPUS_ELEMENT = ['Finestra', 'Balconera', 'Porta', 'Fix', 'Premarc', 'Barana', 'Cobremur', 'Vierteaigües',
  'Pèrgola', 'Tendal', 'Mosquitera', 'Persiana', 'Vidre', 'Reixa', 'Claraboia', 'Remat', 'Altres'];
export const TIPUS_DIBUIXABLES = new Set(['Finestra', 'Balconera', 'Porta', 'Fix']);

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const n = v => (Number.isFinite(+v) ? +v : 0);
const arrodoneix = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function novaObra(dades = {}) {
  return {
    id: uid(),
    client: '', nom: '', tipusClient: 'Particular', material: 'Alumini', abast: 'Fabricació i muntatge',
    telefon: '', adreca: '', numPressupost: '', import: null, bestreta: '',
    dataPressupost: '', muntatgePrevist: '', carpeta: '', notes: '',
    etapes: Array(12).fill(false), datesEtapes: Array(12).fill(null),
    elements: [], comandes: [], remats: [], fotos: [],
    creada: new Date().toISOString(),
    ...dades,
  };
}

// Subtasques de les etapes «Comandes» (5) i «Material rebut» (6)
export const SUBTASQUES = ['Vidres', 'Carpinteria', 'Ferratge', 'Remateria', 'Silicones', 'Altres'];
export const ETAPES_AMB_SUBTASQUES = [5, 6];

function subtasquesDe(obra, etapa) {
  obra.subtasques ||= {};
  if (!obra.subtasques[etapa]) {
    // Obres d'abans de les subtasques: si l'etapa ja estava feta, totes compten com a fetes
    obra.subtasques[etapa] = Object.fromEntries(SUBTASQUES.map(s => [s, !!obra.etapes?.[etapa]]));
  }
  return obra.subtasques[etapa];
}

function posaEtapa(obra, i, valor) {
  obra.etapes[i] = valor;
  obra.datesEtapes ||= Array(12).fill(null);
  if (valor && !obra.datesEtapes[i]) obra.datesEtapes[i] = new Date().toISOString();
  if (!valor) obra.datesEtapes[i] = null;
}

export function marcaEtapa(obra, i, valor) {
  posaEtapa(obra, i, valor);
  if (ETAPES_AMB_SUBTASQUES.includes(i)) {
    const st = subtasquesDe(obra, i);
    for (const s of SUBTASQUES) st[s] = valor;
  }
  return obra;
}

export function marcaSubtasca(obra, etapa, nom, valor) {
  const st = subtasquesDe(obra, etapa);
  st[nom] = valor;
  posaEtapa(obra, etapa, SUBTASQUES.every(s => st[s]));
  return obra;
}

export function progresSubtasques(obra, etapa) {
  if (!ETAPES_AMB_SUBTASQUES.includes(etapa)) return null;
  const st = obra.subtasques?.[etapa] || Object.fromEntries(SUBTASQUES.map(s => [s, !!obra.etapes?.[etapa]]));
  return { fetes: SUBTASQUES.filter(s => st[s]).length, total: SUBTASQUES.length };
}

// Grups per material, en aquest ordre; la resta de materials van a «Altres». Els grups buits no surten.
// i, dins de cada material, per abast (fabricació i muntatge / només fabricació)
export const ABASTOS = ['Fabricació i muntatge', 'Només fabricació'];
export function agrupaPerMaterial(obres = []) {
  const out = [];
  for (const material of ['Alumini', 'PVC', 'Altres']) {
    const delMaterial = obres.filter(o => (o.material === 'Alumini' || o.material === 'PVC' ? o.material : 'Altres') === material);
    for (const abast of ABASTOS) {
      const l = delMaterial.filter(o => (ABASTOS.includes(o.abast) ? o.abast : ABASTOS[0]) === abast);
      if (l.length) out.push({ material, abast, obres: l });
    }
  }
  return out;
}

export const esFinalitzada = obra => !!obra.etapes?.[11];
export const reparacioFinalitzada = rep => rep.estat === 'feta' || rep.estat === 'facturada';

export function etapaActual(obra) {
  const i = (obra.etapes || []).findIndex(e => !e);
  return i === -1 ? 11 : i;
}

export function campsQueFalten(el) {
  if (TIPUS_DIBUIXABLES.has(el.tipus)) {
    const f = ['serie', 'color', 'vidre', 'persiana', 'mosquitera'].filter(k => !el[k]);
    if (!(n(el.w) && n(el.h))) f.push('mides');
    if (!el.parts?.length) f.push('fulles');
    return f;
  }
  return el.tipus ? (n(el.w) || el.descripcio ? [] : ['mides o descripció']) : ['tipus'];
}

export function avisos(obra) {
  const out = [];
  const actual = etapaActual(obra);
  const fetes = i => !!obra.etapes?.[i];
  const perRebre = (obra.comandes || []).filter(c => c.estat !== 'rebuda');
  if (fetes(5) && !fetes(6) && perRebre.length) {
    out.push({ nivell: 'avis', text: 'Falta rebre: ' + perRebre.map(c => c.categoria).join(', ') });
  } else if (fetes(4) && !fetes(5) && actual === 5) {
    const perDemanar = (obra.comandes || []).filter(c => c.estat === 'pendent').length;
    out.push({ nivell: 'avis', text: perDemanar ? `${perDemanar} comandes per demanar` : 'Comandes per fer' });
  }
  if (obra.tipusClient === 'Particular' && fetes(4) && obra.bestreta !== 'cobrada' && obra.bestreta !== 'no cal') {
    out.push({ nivell: 'avis', text: 'Bestreta del 50% pendent' });
  }
  const incomplets = (obra.elements || []).filter(e => campsQueFalten(e).length).length;
  if (incomplets) out.push({ nivell: 'avis', text: `${incomplets} element${incomplets > 1 ? 's' : ''} amb dades per completar` });
  const rem = (obra.remats || []).filter(r => r.estat !== 'fet').length;
  if (rem) out.push({ nivell: 'avis', text: `${rem} remat${rem > 1 ? 's' : ''} pendent${rem > 1 ? 's' : ''}` });
  if (!out.length) out.push({ nivell: 'ok', text: actual === 11 && fetes(11) ? 'Obra acabada' : `En curs: ${ETAPES[actual]}` });
  return out;
}

export function estadistiques(obra) {
  const s = { unitats: 0, m2: 0, m2Vidre: 0, persianes: 0, mosquiteres: 0, perTipus: {} };
  for (const e of obra.elements || []) {
    const q = n(e.q) || 1;
    s.unitats += q;
    s.perTipus[e.tipus || 'Altres'] = (s.perTipus[e.tipus || 'Altres'] || 0) + q;
    if (TIPUS_DIBUIXABLES.has(e.tipus)) s.m2 += q * n(e.w) * n(e.h) / 1e6;
    if (e.persiana && e.persiana !== 'No') s.persianes += q;
    if (e.mosquitera && e.mosquitera !== 'No') s.mosquiteres += q;
  }
  s.m2 = arrodoneix(s.m2, 2);
  s.m2Vidre = arrodoneix(s.m2 * 0.78, 2);
  return s;
}

export function comandesDesDElements(elements = []) {
  const per = {};
  const afegeix = (cat, text) => { (per[cat] ||= []).push({ text }); };
  const dib = elements.filter(e => TIPUS_DIBUIXABLES.has(e.tipus));
  for (const e of dib) {
    const q = n(e.q) || 1, mida = `${n(e.w)} × ${n(e.h)}`, ref = e.ref ? ` (${e.ref})` : '';
    if (e.vidre) afegeix('Vidre', `${q} u · ${e.vidre} · ${mida}${ref}`);
    if (e.persiana && e.persiana !== 'No') afegeix('Persianes', `${q} u · ${e.persiana} · ${mida}${ref}`);
    if (e.mosquitera && e.mosquitera !== 'No') afegeix('Mosquiteres', `${q} u · ${e.mosquitera} · ${mida}${ref}`);
  }
  const series = [...new Set(dib.map(e => [e.serie, e.color].filter(Boolean).join(' · ')).filter(Boolean))];
  const out = [];
  if (dib.length) out.push({ categoria: 'Perfil', linies: series.map(text => ({ text })) });
  if (dib.length) out.push({ categoria: 'Ferratge', linies: [] });
  for (const cat of ['Vidre', 'Persianes', 'Mosquiteres']) if (per[cat]) out.push({ categoria: cat, linies: per[cat] });
  for (const e of elements.filter(x => !TIPUS_DIBUIXABLES.has(x.tipus))) {
    const cat = `Material: ${e.tipus || 'Altres'}`;
    let c = out.find(x => x.categoria === cat);
    if (!c) out.push(c = { categoria: cat, linies: [] });
    c.linies.push({ text: `${n(e.q) || 1} u${n(e.w) ? ` · ${n(e.w)}${n(e.h) ? ` × ${n(e.h)}` : ''}` : ''}${e.descripcio ? ` · ${e.descripcio}` : ''}${e.ref ? ` (${e.ref})` : ''}` });
  }
  return out.map(c => ({ id: uid(), proveidor: '', estat: 'pendent', notes: '', ...c }));
}

export function totalReparacio(rep = {}) {
  const maObra = arrodoneix(n(rep.hores) * n(rep.preuHora));
  const material = arrodoneix((rep.materials || []).reduce((a, m) => a + n(m.q) * n(m.preu), 0));
  return { maObra, material, total: arrodoneix(maObra + material) };
}

// Separa telèfon i ubicació escrits dins del text d'una reparació ("Feina - Lloc - 600000000")
const ES_TELEFON = s => /^[6789][\d\s.]{7,11}$/.test(s.trim()) && s.replace(/\D/g, '').length >= 8 && s.replace(/\D/g, '').length <= 9;
export function separaContacte(text = '') {
  let telefon = '', ubicacio = '';
  const linies = String(text).split('\n').map(l => l.trim()).filter(Boolean);
  const resta = [];
  for (const l of linies) {
    if (!telefon && ES_TELEFON(l)) { telefon = l.replace(/\D/g, ''); continue; }
    resta.push(l);
  }
  const trossos = resta.join('\n').split(/\s+-\s+/);
  const queda = [trossos[0]];
  for (const t of trossos.slice(1)) {
    if (!telefon && ES_TELEFON(t)) telefon = t.replace(/\D/g, '');
    else if (!ubicacio && t.split(/\s+/).length <= 4 && !/[\d+]/.test(t) && !/^contacte/i.test(t)) ubicacio = t.trim();
    else queda.push(t);
  }
  return { que: queda.join(' - ').trim(), telefon, ubicacio };
}

export function ordenaReparacions(reps = []) {
  const pes = { pendent: 0, feta: 1, facturada: 2 };
  return [...reps].sort((a, b) => (pes[a.estat] ?? 9) - (pes[b.estat] ?? 9)
    || String(b.data || '').localeCompare(String(a.data || ''))
    || String(a.creada || '').localeCompare(String(b.creada || '')));
}

export function fmtDiners(v, amagat, decimals = 0) {
  if (amagat) return '•••• €';
  if (!n(v)) return '—';
  const [ent, dec] = n(v).toFixed(decimals).split('.');
  return ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '') + ' €';
}

export function inferirEtapes({ mides = false, comanda = false, fulla = false } = {}) {
  const e = Array(12).fill(false);
  for (let i = 0; i <= 4; i++) e[i] = true;
  if (mides) e[2] = true;
  if (comanda || fulla) e[5] = true;
  if (fulla) { e[6] = true; e[7] = true; }
  return e;
}
