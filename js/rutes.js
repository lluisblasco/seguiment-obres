// Rutes de l'app: #/vista o #/vista/id
export const VISTES = ['inici', 'obres', 'particulars', 'reparacions', 'config'];

export function parseRuta(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const vista = parts[0] || 'inici';
  if (!VISTES.includes(vista)) return { vista: 'inici', id: null };
  return { vista, id: parts[1] ? decodeURIComponent(parts[1]) : null };
}
