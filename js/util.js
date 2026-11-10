// Utilitats de la interfície
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);

export function toast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

export function guardaLocal(clau, valor) { try { localStorage.setItem(clau, JSON.stringify(valor)); } catch { /* sense emmagatzematge */ } }
export function llegeixLocal(clau, perDefecte) {
  try { const v = localStorage.getItem(clau); return v == null ? perDefecte : JSON.parse(v); } catch { return perDefecte; }
}

export function confirma(text, { boto = 'Esborrar', perill = true } = {}) {
  return new Promise(res => {
    const d = document.createElement('dialog');
    d.innerHTML = `<div class="dlg-cap">Confirmar</div><div class="dlg-cos"><p>${esc(text)}</p></div>
      <div class="dlg-peu"><button class="btn" value="no">Cancel·lar</button><button class="btn ${perill ? 'perill' : 'prim'}" value="si">${esc(boto)}</button></div>`;
    document.body.append(d);
    d.addEventListener('click', e => { const b = e.target.closest('button'); if (b) d.close(b.value); });
    d.addEventListener('close', () => { res(d.returnValue === 'si'); d.remove(); });
    d.showModal();
  });
}

// Atributs d'un <input> de diners: amb l'ull tancat no es veu ni es pot editar l'import
export function atributsDiners(valor, amagat) {
  if (amagat) return 'value="" placeholder="•••• (obre l\'ull per veure-ho)" disabled';
  return `value="${esc(valor ?? '')}"`;
}

export const dataCurta = iso => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
