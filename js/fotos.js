// Fotos: reducció de mida abans de desar
export const COSTAT_MAX = 1600;

export function midaReduida(w, h, max = COSTAT_MAX) {
  if (!(w > 0 && h > 0)) return { w: 0, h: 0 };
  const f = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * f), h: Math.round(h * f) };
}

// En un diàleg, les fotos noves i les que es volen treure només es resolen en sortir:
// en desar s'esborren les tretes; en cancel·lar, les noves (així Cancel·lar ho desfà tot)
export function fotosAEsborrar(accio, { noves = [], treure = [] } = {}) {
  return accio === 'desa' ? [...treure] : [...noves];
}

// Navegador: redueix una foto a 1600 px i la torna en JPEG (qualitat 0,8)
export async function comprimeixFoto(fitxer) {
  const bmp = await createImageBitmap(fitxer, { imageOrientation: 'from-image' });
  const { w, h } = midaReduida(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8));
  return blob || fitxer;
}
