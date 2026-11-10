// Dibuix esquemàtic d'una finestra/porta (marc, fulles, línies d'obertura) i icones per a la resta d'elements
import { TIPUS_DIBUIXABLES } from '../model.js';
import { esc } from '../util.js';

const C = { marc: '#3A4A6B', fulla: '#56668A', vidre: '#D8E6F5', vora: '#9DB6D6', linia: '#0B1530', caixo: '#8C99B8' };

export const PARTS = ['Practicable E', 'Practicable D', 'Oscil·lobatent E', 'Oscil·lobatent D', 'Corredissa', 'Fix',
  'Porta E', 'Porta D', 'Montant fix', 'Montant abatible'];

export function dibuixaElement(el, { W = 300, H = 200 } = {}) {
  if (!TIPUS_DIBUIXABLES.has(el.tipus)) return iconaElement(el.tipus, W, H);
  const pad = 12, fw = Math.max(+el.w || 1000, 300), fh = Math.max(+el.h || 1000, 300);
  const s = Math.min((W - 2 * pad) / fw, (H - 2 * pad) / fh);
  const w = fw * s, h = fh * s, x0 = (W - w) / 2, y0 = (H - h) / 2, f = Math.max(5, Math.min(9, w * 0.035));
  const parts = el.parts?.length ? el.parts : [el.tipus === 'Fix' ? 'Fix' : 'Practicable E'];
  const top = parts.filter(p => p.startsWith('Montant')), main = parts.filter(p => !p.startsWith('Montant'));
  let g = '';
  if (el.persiana && el.persiana !== 'No') g += `<rect x="${x0 - 3}" y="${y0 - 12}" width="${w + 6}" height="12" rx="3" fill="${C.caixo}"/>`;
  g += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${C.marc}"/>`;
  const topH = top.length ? h * 0.24 : 0;
  const L = `stroke="${C.linia}" stroke-width="1.3" stroke-dasharray="5 3" fill="none"`;
  const part = (p, x, y, pw, ph) => {
    const ix = x + f * 0.6, iy = y + f * 0.6, iw = pw - f * 1.2, ih = ph - f * 1.2;
    let o = `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${C.fulla}"/>`;
    o += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${C.vidre}" stroke="${C.vora}"/>`;
    if (/Practicable|Oscil|Porta/.test(p)) {
      const esq = / E$/.test(p), hx = esq ? ix : ix + iw, ox = esq ? ix + iw : ix;
      o += `<path d="M${ox} ${iy} L${hx} ${iy + ih / 2} L${ox} ${iy + ih}" ${L}/>`;
      o += `<rect x="${esq ? ix + iw - 7 : ix + 3}" y="${iy + ih / 2 - 9}" width="4" height="18" rx="2" fill="${C.linia}"/>`;
    }
    if (/Oscil/.test(p)) o += `<path d="M${ix} ${iy} L${ix + iw / 2} ${iy + ih} L${ix + iw} ${iy}" ${L}/>`;
    if (p === 'Montant abatible') o += `<path d="M${ix} ${iy + ih} L${ix + iw / 2} ${iy} L${ix + iw} ${iy + ih}" ${L}/>`;
    if (p === 'Corredissa') {
      const ay = iy + ih / 2;
      o += `<path d="M${ix + iw * 0.25} ${ay} h${iw * 0.5} m-8 -6 l8 6 l-8 6" stroke="${C.linia}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (p === 'Fix' || p === 'Montant fix') o += `<text x="${ix + iw / 2}" y="${iy + ih / 2 + 5}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="${Math.max(11, Math.min(18, iw * 0.3))}" fill="#5B6782">F</text>`;
    return o;
  };
  top.forEach((p, i) => { const pw = (w - 2 * f) / top.length; g += part(p, x0 + f + i * pw, y0 + f, pw, topH - f); });
  const my = y0 + f + topH, mh = h - 2 * f - topH, mw = (w - 2 * f) / main.length;
  main.forEach((p, i) => { g += part(p, x0 + f + i * mw, my, mw, mh); });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dibuix de ${esc(el.ref || el.tipus)}">${g}</svg>`;
}

const ICONES = {
  Premarc: '<rect x="20" y="10" width="60" height="80" fill="none" stroke="#3A4A6B" stroke-width="6"/>',
  Barana: '<path d="M10 30h80M10 30v55M90 30v55M10 85h80" stroke="#3A4A6B" stroke-width="5" fill="none"/><path d="M25 30v55M40 30v55M55 30v55M70 30v55" stroke="#8C99B8" stroke-width="3"/>',
  Cobremur: '<path d="M8 40h84l-6 10H14z" fill="#3A4A6B"/><rect x="20" y="50" width="60" height="40" fill="#D8E6F5"/>',
  Vierteaigües: '<path d="M10 55h80l-4 10H10z" fill="#3A4A6B"/><rect x="20" y="20" width="60" height="35" fill="#D8E6F5" stroke="#9DB6D6"/>',
  Pèrgola: '<path d="M10 25h80" stroke="#3A4A6B" stroke-width="7"/><path d="M18 25v65M82 25v65" stroke="#3A4A6B" stroke-width="5"/><path d="M22 35h56M22 45h56M22 55h56" stroke="#8C99B8" stroke-width="4"/>',
  Tendal: '<path d="M10 25h80" stroke="#3A4A6B" stroke-width="6"/><path d="M12 28h76l-10 30H22z" fill="#E8A33D" opacity=".85"/><path d="M22 58h56" stroke="#3A4A6B" stroke-width="3"/>',
  Mosquitera: '<rect x="20" y="10" width="60" height="80" rx="3" fill="none" stroke="#3A4A6B" stroke-width="5"/><path d="M28 10v80M36 10v80M44 10v80M52 10v80M60 10v80M68 10v80M20 25h60M20 40h60M20 55h60M20 70h60" stroke="#8C99B8" stroke-width="1"/>',
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
