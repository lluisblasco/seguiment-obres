// Sincronització mòbil ↔ ordinador amb Supabase (només fetch, sense llibreries).
// Cada obra o reparació és una fila de la taula «registres» del núvol. Guanya la versió modificada més tard.
// Les dades d'accés (adreça, clau, correu i contrasenya) les escriu el Lluís a Configuració; la contrasenya no es desa mai.
export const TAULES = ['obres', 'reparacions'];
const ms = d => (d ? Date.parse(d) : 0);
const iso = d => new Date(d).toISOString();

// Decideix què cal desar aquí i què cal enviar al núvol (lògica pura, sense xarxa)
export function planifica({ locals, remots, esborrats, ultimEnviament, ara }) {
  const aplicar = [], enviar = [], tocats = new Set();
  for (const r of remots) {
    const local = (locals[r.taula] || []).find(o => o.id === r.id);
    const clau = `${r.taula}/${r.id}`;
    if (r.esborrat) {
      if (local && ms(local._mod) <= ms(r.modificat)) { aplicar.push({ taula: r.taula, accio: 'esborra', id: r.id, claus: r.dades?.claus || [] }); tocats.add(clau); }
      continue;
    }
    if (!local || ms(local._mod) < ms(r.modificat)) {
      aplicar.push({ taula: r.taula, accio: 'desa', id: r.id, dades: { ...r.dades, _mod: iso(r.modificat) } });
      tocats.add(clau);
    }
  }
  for (const taula of TAULES) {
    for (const o of locals[taula] || []) {
      if (tocats.has(`${taula}/${o.id}`)) continue;
      if (ultimEnviament && o._mod && ms(o._mod) <= ms(ultimEnviament)) continue;
      const mod = o._mod || ara;
      enviar.push({ taula, id: o.id, dades: { ...o, _mod: mod }, modificat: mod, esborrat: false });
    }
  }
  for (const e of esborrats) enviar.push({ taula: e.taula, id: e.id, dades: { claus: e.claus || [] }, modificat: e.mod, esborrat: true });
  return { aplicar, enviar };
}

// Consulta de files noves al núvol, amb un minut de marge (si una fila arriba tard no es perd; repetir-la no fa res)
export function consultaRemots(ultimaRebuda, offset = 0) {
  const p = new URLSearchParams({ select: 'taula,id,dades,modificat,esborrat,rebut', order: 'rebut.asc', limit: '500', offset: String(offset) });
  if (ultimaRebuda) p.set('rebut', 'gt.' + new Date(ms(ultimaRebuda) - 60000).toISOString());
  return 'registres?' + p.toString();
}

export const ordreRemot = (files, abans) => files.reduce((m, f) => (ms(f.rebut) > ms(m) ? iso(f.rebut) : m), abans);

// ---------- Client del núvol ----------
export class Nuvol {
  constructor(cfg, fetcher = (...a) => fetch(...a)) { this.cfg = cfg; this.f = fetcher; }
  get base() { return this.cfg.url.replace(/\/+$/, ''); }

  async #auth(tipus, cos) {
    const r = await this.f(`${this.base}/auth/v1/token?grant_type=${tipus}`, {
      method: 'POST', headers: { apikey: this.cfg.clau, 'Content-Type': 'application/json' }, body: JSON.stringify(cos),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error_description || d.msg || 'No s\'ha pogut entrar (correu o contrasenya?)');
    Object.assign(this.cfg, { token: d.access_token, refresh: d.refresh_token, caduca: Date.now() + (d.expires_in - 60) * 1000, usuari: d.user?.id || this.cfg.usuari });
  }
  entra(email, contrasenya) { return this.#auth('password', { email, password: contrasenya }); }

  async #capcaleres() {
    if (!this.cfg.token || Date.now() > (this.cfg.caduca || 0)) await this.#auth('refresh_token', { refresh_token: this.cfg.refresh });
    return { apikey: this.cfg.clau, Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json' };
  }

  async baixa(ultimaRebuda) {
    const totes = [];
    for (let off = 0; ; off += 500) {
      const r = await this.f(`${this.base}/rest/v1/${consultaRemots(ultimaRebuda, off)}`, { headers: await this.#capcaleres() });
      if (!r.ok) throw new Error(`El núvol no respon (${r.status})`);
      const files = await r.json();
      totes.push(...files);
      if (files.length < 500) return totes;
    }
  }

  async puja(files) {
    for (let i = 0; i < files.length; i += 200) {
      const tros = files.slice(i, i + 200).map(f => ({ ...f, usuari: this.cfg.usuari }));
      const r = await this.f(`${this.base}/rest/v1/registres?on_conflict=usuari,taula,id`, {
        method: 'POST', headers: { ...(await this.#capcaleres()), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(tros),
      });
      if (!r.ok) throw new Error(`No s'ha pogut enviar al núvol (${r.status})`);
    }
  }
}
