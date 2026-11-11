// Dibuix esquemàtic de finestres, portes i mosquiteres (alçat vist des de l'interior).
// Convenció de les línies d'obertura: convergeixen cap al costat de la MANETA (oposat a la frontissa).
// «E» = frontissa a l'esquerra (vèrtex a la dreta); «D» = frontissa a la dreta (vèrtex a l'esquerra).
// La basculant (oscil·lobatent, montant abatible) obre per dalt: vèrtex a dalt al mig.
import { TIPUS_DIBUIXABLES } from '../model.js';
import { esc } from '../util.js';

const C = {
  marc: '#2F3E5C', fulla: '#4A5A7A', fullaClar: '#6B7A98', vidre1: '#EAF2FA', vidre2: '#C9DCEE', vora: '#9DB6D6',
  linia: '#0B1530', caixo: '#7C879F', lama: '#9AA4B8', malla: '#5B6782', guia: '#3A4A6B', cota: '#5B6782',
};

export const PARTS = ['Practicable E', 'Practicable D', 'Oscil·lobatent E', 'Oscil·lobatent D', 'Corredissa', 'Fix',
  'Porta E', 'Porta D', 'Montant fix', 'Montant abatible'];
// Tipus del catàleg de mosquiteres Saxun (saxun.com/mosquiteras)
export const TIPUS_MOSQUITERA = ['Enrotllable', 'Antivent (zip)', 'Plisada lateral', 'Plisada vertical', 'Plisada reversible',
  'Lateral (porta)', 'Corredissa', 'Abatible (porta)', 'Fixa'];

let idSvg = 0;
const r1 = n => Math.round(n * 10) / 10;

// Línies d'obertura d'una part dins del rectangle del vidre {x,y,w,h}: llista de polilínies [[x,y],[x,y],[x,y]]
export function liniesObertura(part, { x, y, w, h }) {
  const out = [];
  if (/Practicable|Oscil|Porta/.test(part)) {
    const frontEsq = / E$/.test(part);
    const xf = frontEsq ? x : x + w;          // costat de la frontissa
    const xm = frontEsq ? x + w : x;          // costat de la maneta (vèrtex)
    out.push([[xf, y], [xm, y + h / 2], [xf, y + h]]);
  }
  if (/Oscil/.test(part) || part === 'Montant abatible') out.push([[x, y + h], [x + w / 2, y], [x + w, y + h]]);
  return out;
}

// Normalitza el tipus de mosquitera a partir de qualsevol text («Mosquitera plisada», «enrollable», «corredera»...)
export function tipusMosquitera(text) {
  const t = String(text || '').toLowerCase();
  if (!t || t === 'no') return null;
  if (/plis/.test(t)) return /revers/.test(t) ? 'Plisada reversible' : /vertical/.test(t) ? 'Plisada vertical' : 'Plisada lateral';
  if (/antivi|antiv|zip|cremall/.test(t)) return 'Antivent (zip)';
  if (/lateral/.test(t)) return 'Lateral (porta)';
  if (/(enrot|enroll|enrol)/.test(t)) return 'Enrotllable';
  if (/corred/.test(t)) return 'Corredissa';
  if (/abat|batent|practic/.test(t)) return 'Abatible (porta)';
  return 'Fixa';
}

// ---------- Peces comunes ----------
const defs = id => `<defs>
  <linearGradient id="v${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.vidre1}"/><stop offset="1" stop-color="${C.vidre2}"/></linearGradient>
  <pattern id="m${id}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0H5M0 0V5" stroke="${C.malla}" stroke-width=".5" opacity=".55"/></pattern>
</defs>`;

const polilinia = (pts, extra = '') => `<polyline points="${pts.map(p => p.map(r1).join(',')).join(' ')}" fill="none" stroke="${C.linia}" stroke-width="1.1" stroke-linejoin="round" ${extra}/>`;

function vidre(id, x, y, w, h) {
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="url(#v${id})" stroke="${C.vora}" stroke-width=".8"/>
    <path d="M${r1(x + w * .14)} ${r1(y + h * .22)} l${r1(Math.min(w, h) * .16)} ${r1(-Math.min(w, h) * .16)} M${r1(x + w * .14)} ${r1(y + h * .32)} l${r1(Math.min(w, h) * .26)} ${r1(-Math.min(w, h) * .26)}" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>`;
}

function maneta(x, yMig, cap, gran = false) {
  // cap = 1 maneta mirant a la dreta (a la vora esquerra de la fulla), -1 a l'esquerra
  const l = gran ? 16 : 11;
  return `<g fill="${C.linia}"><rect x="${r1(x - 2)}" y="${r1(yMig - 6)}" width="4" height="12" rx="1.6"/>
    <rect x="${r1(cap > 0 ? x : x - 2.4)}" y="${r1(yMig - 1.2)}" width="2.4" height="${l}" rx="1.2" transform="rotate(${cap > 0 ? -8 : 8} ${r1(x)} ${r1(yMig)})"/></g>`;
}

function fletxa(x1, x2, y) {
  const d = x2 > x1 ? 1 : -1;
  return `<path d="M${r1(x1)} ${r1(y)} H${r1(x2)} m${-7 * d} -5 l${7 * d} 5 l${-7 * d} 5" stroke="${C.linia}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cotes(x0, y0, w, h, ample, alt) {
  const yC = y0 + h + 14, xC = x0 + w + 14;
  const t = (x, y, txt, rot = 0) => `<text x="${r1(x)}" y="${r1(y)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="${C.cota}"${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ''}>${ample !== undefined || alt !== undefined ? txt : ''}</text>`;
  return `<g stroke="${C.cota}" stroke-width=".8">
    <path d="M${r1(x0)} ${r1(yC)} H${r1(x0 + w)} M${r1(x0)} ${r1(yC - 4)} v8 M${r1(x0 + w)} ${r1(yC - 4)} v8"/>
    <path d="M${r1(xC)} ${r1(y0)} V${r1(y0 + h)} M${r1(xC - 4)} ${r1(y0)} h8 M${r1(xC - 4)} ${r1(y0 + h)} h8"/></g>
    ${ample ? t(x0 + w / 2, yC + 13, ample) : ''}${alt ? t(xC + 13, y0 + h / 2, alt, -90) : ''}`;
}

// ---------- Finestres i portes ----------
export function dibuixaElement(el, { W = 300, H = 200, cotes: ambCotes = false } = {}) {
  if (el.tipus === 'Mosquitera') return dibuixaMosquitera(tipusMosquitera(el.mosquitera || el.descripcio) || 'Fixa', el, { W, H, cotes: ambCotes });
  if (!TIPUS_DIBUIXABLES.has(el.tipus)) return iconaElement(el.tipus, W, H);
  const id = ++idSvg;
  const marge = ambCotes ? 30 : 12;
  const fw = Math.max(+el.w || 1000, 300), fh = Math.max(+el.h || 1000, 300);
  const teCaixo = el.persiana && el.persiana !== 'No';
  const s = Math.min((W - marge - 12) / fw, (H - marge - 12 - (teCaixo ? 16 : 0)) / fh);
  const w = fw * s, h = fh * s, x0 = (W - marge + 12 - w) / 2, y0 = (H - marge + 12 - h) / 2 + (teCaixo ? 8 : 0);
  const f = Math.max(5, Math.min(10, w * .04));           // gruix del marc
  const parts = el.parts?.length ? el.parts : [el.tipus === 'Fix' ? 'Fix' : el.tipus === 'Porta' ? 'Porta E' : 'Practicable E'];
  const top = parts.filter(p => p.startsWith('Montant')), main = parts.filter(p => !p.startsWith('Montant'));
  const mosq = tipusMosquitera(el.mosquitera);
  let g = defs(id);

  if (teCaixo) {
    g += `<rect x="${r1(x0 - 4)}" y="${r1(y0 - 16)}" width="${r1(w + 8)}" height="14" rx="3" fill="${C.caixo}"/>`;
    for (let i = 1; i <= 3; i++) g += `<path d="M${r1(x0)} ${r1(y0 - 16 + i * 3.5)} H${r1(x0 + w)}" stroke="${C.lama}" stroke-width=".8"/>`;
  }
  g += `<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(w)}" height="${r1(h)}" rx="3" fill="${C.marc}"/>`;
  g += `<rect x="${r1(x0 + 1.5)}" y="${r1(y0 + 1.5)}" width="${r1(w - 3)}" height="${r1(h - 3)}" rx="2" fill="none" stroke="#fff" stroke-opacity=".12"/>`;

  const peca = (p, x, y, pw, ph, idx, total) => {
    let o = '';
    const fix = p === 'Fix' || p === 'Montant fix';
    const fs = fix ? f * .35 : f * .9;                      // gruix de fulla (el fix va directe al marc)
    if (!fix) o += `<rect x="${r1(x + 1)}" y="${r1(y + 1)}" width="${r1(pw - 2)}" height="${r1(ph - 2)}" rx="1.5" fill="${C.fulla}" stroke="${C.fullaClar}" stroke-width=".6"/>`;
    const v = { x: x + fs, y: y + fs, w: pw - fs * 2, h: ph - fs * 2 };
    o += vidre(id, v.x, v.y, v.w, v.h);
    if (mosq && !p.startsWith('Montant')) o += `<rect x="${r1(v.x)}" y="${r1(v.y)}" width="${r1(v.w)}" height="${r1(v.h)}" fill="url(#m${id})" opacity=".55"/>`;
    for (const l of liniesObertura(p, v)) o += polilinia(l);
    // Fulla passiva: practicable al costat d'una oscil·lobatent (l'activa és l'oscil·lobatent) → sense maneta
    const passiva = /Practicable/.test(p) && main.some(q => /Oscil/.test(q));
    if (/Practicable|Oscil|Porta/.test(p) && !passiva) {
      const esq = / E$/.test(p);                            // frontissa a l'esquerra → maneta a la dreta
      const xm = esq ? x + pw - fs / 2 : x + fs / 2;
      o += maneta(xm, y + ph / 2, esq ? -1 : 1, /Porta/.test(p));
    }
    if (p === 'Corredissa') {
      const yA = v.y + v.h / 2, cap = idx % 2 === 0 ? 1 : -1;
      o += fletxa(cap > 0 ? v.x + v.w * .22 : v.x + v.w * .78, cap > 0 ? v.x + v.w * .78 : v.x + v.w * .22, yA);
      o += maneta(cap > 0 ? x + fs / 2 : x + pw - fs / 2, yA, cap);
    }
    if (fix) o += `<text x="${r1(v.x + v.w / 2)}" y="${r1(v.y + v.h / 2 + 5)}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="${r1(Math.max(11, Math.min(18, v.w * .3)))}" fill="${C.malla}">F</text>`;
    return o;
  };
  const topH = top.length ? h * .24 : 0;
  top.forEach((p, i) => { const pw = (w - 2 * f) / top.length; g += peca(p, x0 + f + i * pw, y0 + f, pw, topH - f * .5, i, top.length); });
  if (top.length) g += `<rect x="${r1(x0 + f)}" y="${r1(y0 + f + topH - f * .5)}" width="${r1(w - 2 * f)}" height="${r1(f * .8)}" fill="${C.marc}"/>`;
  const my = y0 + f + topH + (top.length ? f * .3 : 0), mh = h - 2 * f - topH - (top.length ? f * .3 : 0), mw = (w - 2 * f) / main.length;
  main.forEach((p, i) => { g += peca(p, x0 + f + i * mw, my, mw, mh, i, main.length); });
  if (el.tipus === 'Porta' || main.some(p => p.startsWith('Porta'))) g += `<rect x="${r1(x0 - 2)}" y="${r1(y0 + h - 2)}" width="${r1(w + 4)}" height="3" fill="${C.linia}" opacity=".5"/>`;
  if (ambCotes) g += cotes(x0, y0, w, h, el.w ? `${el.w}` : '', el.h ? `${el.h}` : '');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dibuix de ${esc(el.ref || el.tipus)}">${g}</svg>`;
}

// ---------- Mosquiteres ----------
export function dibuixaMosquitera(tipus, el = {}, { W = 300, H = 200, cotes: ambCotes = false } = {}) {
  const id = ++idSvg;
  const marge = ambCotes ? 30 : 12;
  const fw = Math.max(+el.w || 1000, 300), fh = Math.max(+el.h || 1200, 300);
  const s = Math.min((W - marge - 12) / fw, (H - marge - 22) / fh);
  const w = fw * s, h = fh * s, x0 = (W - marge + 12 - w) / 2, y0 = (H - marge + 12 - h) / 2 + 6;
  const f = Math.max(4, Math.min(8, w * .035));
  let g = defs(id);
  const malla = (x, y, mw, mh) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(mw)}" height="${r1(mh)}" fill="#F4F6FA"/><rect x="${r1(x)}" y="${r1(y)}" width="${r1(mw)}" height="${r1(mh)}" fill="url(#m${id})"/>`;
  const marc = (x, y, mw, mh, gruix = f) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(mw)}" height="${r1(mh)}" rx="2" fill="${C.marc}"/><rect x="${r1(x + gruix)}" y="${r1(y + gruix)}" width="${r1(mw - 2 * gruix)}" height="${r1(mh - 2 * gruix)}" fill="#fff"/>`;

  switch (tipus) {
    case 'Enrotllable':
    case 'Antivent (zip)': {
      const caixo = Math.max(12, h * .1), baixa = h * .62;
      g += `<rect x="${r1(x0 - 3)}" y="${r1(y0 - 2)}" width="${r1(w + 6)}" height="${r1(caixo)}" rx="3" fill="${C.caixo}"/>`;
      g += `<rect x="${r1(x0)}" y="${r1(y0 + caixo - 2)}" width="${r1(f)}" height="${r1(h - caixo + 2)}" fill="${C.guia}"/><rect x="${r1(x0 + w - f)}" y="${r1(y0 + caixo - 2)}" width="${r1(f)}" height="${r1(h - caixo + 2)}" fill="${C.guia}"/>`;
      g += malla(x0 + f, y0 + caixo, w - 2 * f, baixa);
      g += `<rect x="${r1(x0 + f)}" y="${r1(y0 + caixo + baixa)}" width="${r1(w - 2 * f)}" height="${r1(f * .9)}" rx="1.5" fill="${C.marc}"/>`;
      g += `<rect x="${r1(x0 + w / 2 - 9)}" y="${r1(y0 + caixo + baixa + f * .9)}" width="18" height="4" rx="2" fill="${C.linia}"/>`;
      g += `<path d="M${r1(x0 + w / 2)} ${r1(y0 + caixo + baixa + 14)} v${r1(Math.min(22, h * .14))} m-5 -6 l5 6 l5 -6" stroke="${C.linia}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (tipus === 'Antivent (zip)') {   // guia de cremallera: dents a les dues guies
        for (let yy = y0 + caixo + 2; yy < y0 + h - 2; yy += 5) {
          g += `<path d="M${r1(x0 + f)} ${r1(yy)} h3 M${r1(x0 + w - f)} ${r1(yy + 2.5)} h-3" stroke="${C.contrast || '#E8A33D'}" stroke-width="1.6"/>`;
        }
      }
      break;
    }
    case 'Lateral (porta)': {
      const caixo = Math.max(12, w * .1), obert = w * .6;
      g += `<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(caixo)}" height="${r1(h)}" rx="3" fill="${C.caixo}"/>`;
      g += `<rect x="${r1(x0 + caixo - 2)}" y="${r1(y0)}" width="${r1(w - caixo + 2)}" height="${r1(f)}" fill="${C.guia}"/><rect x="${r1(x0 + caixo - 2)}" y="${r1(y0 + h - f)}" width="${r1(w - caixo + 2)}" height="${r1(f)}" fill="${C.guia}"/>`;
      g += malla(x0 + caixo, y0 + f, obert, h - 2 * f);
      g += `<rect x="${r1(x0 + caixo + obert)}" y="${r1(y0 + f)}" width="${r1(f * .9)}" height="${r1(h - 2 * f)}" rx="1.5" fill="${C.marc}"/>`;
      g += maneta(x0 + caixo + obert + f * .45, y0 + h / 2, 1);
      g += fletxa(x0 + caixo + obert + 14, x0 + caixo + obert + Math.min(30, (w - caixo - obert) * .8), y0 + h / 2 + 22);
      break;
    }
    case 'Plisada lateral': {
      const plecs = Math.max(4, Math.round(w / 18)), plegat = w * .16, obert = w * .5;
      g += marc(x0, y0, w, h, f * .8);
      const xi = x0 + f;
      let d = `M${r1(xi)} ${r1(y0 + f)}`;
      for (let i = 0; i <= plecs; i++) d += ` L${r1(xi + (plegat / plecs) * i)} ${r1(i % 2 ? y0 + f + 4 : y0 + f)}`;
      g += `<rect x="${r1(xi)}" y="${r1(y0 + f)}" width="${r1(plegat + obert)}" height="${r1(h - 2 * f)}" fill="url(#m${id})"/>`;
      for (let i = 0; i <= plecs; i++) {
        const x = xi + (plegat / plecs) * i;
        g += `<path d="M${r1(x)} ${r1(y0 + f)} V${r1(y0 + h - f)}" stroke="${C.malla}" stroke-width="${i % 2 ? .6 : 1.1}"/>`;
      }
      for (let i = 1; i < 6; i++) {
        const x = xi + plegat + (obert / 6) * i;
        g += `<path d="M${r1(x)} ${r1(y0 + f)} V${r1(y0 + h - f)}" stroke="${C.malla}" stroke-width=".7" stroke-dasharray="2 3"/>`;
      }
      g += `<rect x="${r1(xi + plegat + obert)}" y="${r1(y0 + f)}" width="${r1(f)}" height="${r1(h - 2 * f)}" rx="1.5" fill="${C.marc}"/>`;
      g += maneta(xi + plegat + obert + f / 2, y0 + h / 2, 1);
      g += fletxa(xi + plegat + obert + 12, Math.min(x0 + w - f - 4, xi + plegat + obert + 40), y0 + h / 2 + 22);
      break;
    }
    case 'Corredissa': {
      g += `<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(w)}" height="${r1(f)}" fill="${C.guia}"/><rect x="${r1(x0)}" y="${r1(y0 + h - f)}" width="${r1(w)}" height="${r1(f)}" fill="${C.guia}"/>`;
      const pw = w * .56;
      g += marc(x0 + f, y0 + f * 1.4, pw, h - f * 2.8, f * .8) + malla(x0 + f * 1.8, y0 + f * 2.2, pw - f * 1.6, h - f * 4.4);
      g += `<circle cx="${r1(x0 + f + pw * .2)}" cy="${r1(y0 + h - f * 1.2)}" r="2.6" fill="${C.linia}"/><circle cx="${r1(x0 + f + pw * .8)}" cy="${r1(y0 + h - f * 1.2)}" r="2.6" fill="${C.linia}"/>`;
      g += maneta(x0 + f + pw - f * .4, y0 + h / 2, -1);
      g += fletxa(x0 + f + pw + 8, Math.min(x0 + w - 6, x0 + f + pw + 40), y0 + h / 2);
      break;
    }
    case 'Abatible (porta)': {
      g += marc(x0, y0, w, h, f * .7);
      g += `<rect x="${r1(x0 + f * .7)}" y="${r1(y0 + f * .7)}" width="${r1(w - f * 1.4)}" height="${r1(h - f * 1.4)}" rx="1.5" fill="${C.fulla}"/>`;
      const v = { x: x0 + f * 1.6, y: y0 + f * 1.6, w: w - f * 3.2, h: h - f * 3.2 };
      g += malla(v.x, v.y, v.w, v.h);
      for (const l of liniesObertura('Practicable E', v)) g += polilinia(l);
      g += maneta(x0 + w - f * 1.15, y0 + h / 2, -1);
      for (const yy of [y0 + h * .2, y0 + h * .8]) g += `<rect x="${r1(x0 + f * .3)}" y="${r1(yy - 5)}" width="${r1(f * .8)}" height="10" rx="1" fill="${C.linia}"/>`;
      break;
    }
    case 'Plisada vertical': {
      g += marc(x0, y0, w, h, f * .8);
      const yi = y0 + f, plecs = Math.max(4, Math.round(h / 22)), plegat = h * .12, obert = h * .5;
      g += `<rect x="${r1(x0 + f)}" y="${r1(yi)}" width="${r1(w - 2 * f)}" height="${r1(plegat + obert)}" fill="url(#m${id})"/>`;
      for (let i = 0; i <= plecs; i++) g += `<path d="M${r1(x0 + f)} ${r1(yi + (plegat / plecs) * i)} H${r1(x0 + w - f)}" stroke="${C.malla}" stroke-width="${i % 2 ? .6 : 1.1}"/>`;
      for (let i = 1; i < 6; i++) g += `<path d="M${r1(x0 + f)} ${r1(yi + plegat + (obert / 6) * i)} H${r1(x0 + w - f)}" stroke="${C.malla}" stroke-width=".7" stroke-dasharray="2 3"/>`;
      g += `<rect x="${r1(x0 + f)}" y="${r1(yi + plegat + obert)}" width="${r1(w - 2 * f)}" height="${r1(f)}" rx="1.5" fill="${C.marc}"/>`;
      g += `<rect x="${r1(x0 + w / 2 - 9)}" y="${r1(yi + plegat + obert + f)}" width="18" height="4" rx="2" fill="${C.linia}"/>`;
      g += `<path d="M${r1(x0 + w / 2)} ${r1(yi + plegat + obert + f + 10)} v${r1(Math.min(22, h * .14))} m-5 -6 l5 6 l5 -6" stroke="${C.linia}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }
    case 'Plisada reversible': {
      g += marc(x0, y0, w, h, f * .8);
      const xc = x0 + w / 2, plegat = w * .1, plecs = Math.max(4, Math.round(w / 22));
      g += `<rect x="${r1(x0 + f)}" y="${r1(y0 + f)}" width="${r1(w - 2 * f)}" height="${r1(h - 2 * f)}" fill="url(#m${id})"/>`;
      for (let i = 0; i <= plecs; i++) g += `<path d="M${r1(xc - plegat / 2 + (plegat / plecs) * i)} ${r1(y0 + f)} V${r1(y0 + h - f)}" stroke="${C.malla}" stroke-width="${i % 2 ? .6 : 1.1}"/>`;
      for (const xb of [xc - plegat / 2 - f, xc + plegat / 2]) g += `<rect x="${r1(xb)}" y="${r1(y0 + f)}" width="${r1(f)}" height="${r1(h - 2 * f)}" rx="1.5" fill="${C.marc}"/>`;
      g += fletxa(xc - plegat / 2 - f - 6, Math.max(x0 + f + 6, xc - plegat / 2 - f - 34), y0 + h / 2 + 22);
      g += fletxa(xc + plegat / 2 + f + 6, Math.min(x0 + w - f - 6, xc + plegat / 2 + f + 34), y0 + h / 2 + 22);
      break;
    }
    default: { // Fixa
      g += marc(x0, y0, w, h, f);
      g += malla(x0 + f, y0 + f, w - 2 * f, h - 2 * f);
      g += `<text x="${r1(x0 + w / 2)}" y="${r1(y0 + h / 2 + 6)}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="${r1(Math.max(11, Math.min(18, w * .2)))}" fill="${C.malla}">F</text>`;
    }
  }
  if (ambCotes) g += cotes(x0, y0, w, h, el.w ? `${el.w}` : '', el.h ? `${el.h}` : '');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mosquitera ${esc(tipus)}">${g}</svg>`;
}

// ---------- Icones de la resta d'elements ----------
const ICONES = {
  Premarc: '<rect x="20" y="10" width="60" height="80" fill="none" stroke="#3A4A6B" stroke-width="6"/>',
  Barana: '<path d="M10 30h80M10 30v55M90 30v55M10 85h80" stroke="#3A4A6B" stroke-width="5" fill="none"/><path d="M25 30v55M40 30v55M55 30v55M70 30v55" stroke="#8C99B8" stroke-width="3"/>',
  Cobremur: '<path d="M8 40h84l-6 10H14z" fill="#3A4A6B"/><rect x="20" y="50" width="60" height="40" fill="#D8E6F5"/>',
  Vierteaigües: '<path d="M10 55h80l-4 10H10z" fill="#3A4A6B"/><rect x="20" y="20" width="60" height="35" fill="#D8E6F5" stroke="#9DB6D6"/>',
  Pèrgola: '<path d="M10 25h80" stroke="#3A4A6B" stroke-width="7"/><path d="M18 25v65M82 25v65" stroke="#3A4A6B" stroke-width="5"/><path d="M22 35h56M22 45h56M22 55h56" stroke="#8C99B8" stroke-width="4"/>',
  Tendal: '<path d="M10 25h80" stroke="#3A4A6B" stroke-width="6"/><path d="M12 28h76l-10 30H22z" fill="#E8A33D" opacity=".85"/><path d="M22 58h56" stroke="#3A4A6B" stroke-width="3"/>',
  Persiana: '<rect x="15" y="10" width="70" height="14" rx="3" fill="#3A4A6B"/><path d="M18 32h64M18 42h64M18 52h64M18 62h64M18 72h64M18 82h64" stroke="#8C99B8" stroke-width="6"/>',
  Vidre: '<rect x="20" y="10" width="60" height="80" fill="#D8E6F5" stroke="#9DB6D6" stroke-width="3"/><path d="M30 30l15-12M30 45l25-22" stroke="#fff" stroke-width="3"/>',
  Reixa: '<rect x="15" y="10" width="70" height="80" fill="none" stroke="#3A4A6B" stroke-width="5"/><path d="M32 10v80M50 10v80M68 10v80" stroke="#3A4A6B" stroke-width="4"/>',
  Claraboia: '<path d="M10 70L50 25l40 45z" fill="#D8E6F5" stroke="#3A4A6B" stroke-width="5"/>',
  Remat: '<path d="M15 30h50v45h20" stroke="#3A4A6B" stroke-width="7" fill="none" stroke-linejoin="round"/>',
  Altres: '<rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="#3A4A6B" stroke-width="5"/><path d="M50 38v24M38 50h24" stroke="#8C99B8" stroke-width="5"/>',
};

export function iconaElement(tipus, W = 100, H = 100) {
  const d = ICONES[tipus] || ICONES.Altres;
  const s = Math.min(W, H);
  return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" role="img" aria-label="${esc(tipus)}">${d}</svg>`;
}
