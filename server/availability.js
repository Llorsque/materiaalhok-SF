// Beschikbaarheid per dag — één bron van waarheid (v2).
//
// Achtergrond: tot en met v1.20.x rekende de server (checkStock) alle bonnen
// bij elkaar op die ergens in de gevraagde periode vielen, ook als ze elkaar
// onderling niet overlapten. Twee bonnen van 5 stuks op ma–di en do–vr gaven
// voor een aanvraag ma–vr dus "10 bezet", terwijl er op geen enkele dag meer
// dan 5 weg waren. Daarnaast rekende de frontend van gewone gebruikers met
// alleen hun eigen bonnen, waardoor ze reserveringen van anderen niet zagen.
//
// Vanaf v2 rekent alleen de server, en wel per kalenderdag:
//
//   * Een bon bezet de dagen [start_date, return_date) — de retourdag zelf
//     telt NIET als bezet. Dat werkt dankzij de vaste overdrachtstijden
//     (BESLUITEN.md, "v2 — overdrachtstijden"): inleveren vóór
//     `handover_return_before` (standaard 12:00), ophalen vanaf
//     `handover_pickup_from` (standaard 13:00). Op de retourdag van bon A kan
//     bon B dus hetzelfde materiaal ophalen.
//   * Een aanvraag [S, R) is mogelijk als op ELKE dag in [S, R) genoeg vrij is.
//     Beschikbaar = het minimum van vrij over die dagen.
//   * Een actieve bon die over zijn retourdatum heen is (te laat) bezet het
//     materiaal nog tot en met vandaag. Het is fysiek nog weg; wanneer het
//     terugkomt weten we niet, dus de dagen ná vandaag blokkeren we niet.
//   * Unieke items die buiten dienst zijn (kwijt/kapot) hebben 0 beschikbaar.
//
// Datums zijn kalenderdagen (YYYY-MM-DD). Oude bonnen met een volledige ISO-
// timestamp worden op de eerste 10 tekens afgekapt.

const db = require('./db');
const { getSetting } = require('./utils');

const DEFAULT_RETURN_BEFORE = '12:00';
const DEFAULT_PICKUP_FROM = '13:00';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function handoverTimes() {
  const rb = getSetting('handover_return_before', DEFAULT_RETURN_BEFORE);
  const pf = getSetting('handover_pickup_from', DEFAULT_PICKUP_FROM);
  return {
    return_before: TIME_RE.test(rb || '') ? rb : DEFAULT_RETURN_BEFORE,
    pickup_from: TIME_RE.test(pf || '') ? pf : DEFAULT_PICKUP_FROM,
  };
}

function ymd(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function todayNL() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Dagen in het halfopen interval [start, end). Als end <= start (zou niet
// voor moeten komen; de API eist return > start) nemen we alleen de startdag.
function daysIn(start, end) {
  const out = [];
  let d = start;
  const stop = end > start ? end : addDays(start, 1);
  // Harde grens tegen absurde periodes (bv. typfout 2062): max ~2 jaar.
  for (let i = 0; d < stop && i < 750; i++) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

// Alle openstaande bezetting (niet-geretourneerde, niet-verwijderde items op
// actieve of gereserveerde bonnen), met effectieve begin/einddag.
function loadOccupancy(excludeBonId = null) {
  const today = todayNL();
  const rows = db.prepare(`
    SELECT bi.material_id, bi.set_id, bi.quantity,
           b.id AS bon_id, b.bon_number, b.status, b.start_date, b.return_date,
           b.user_id, u.name AS user_name, b.external_org
    FROM bon_items bi
    JOIN bons b ON b.id = bi.bon_id
    LEFT JOIN users u ON u.id = b.user_id
    WHERE bi.returned = 0
      AND bi.removed_at_pickup = 0
      AND b.status IN ('active', 'reserved')
  `).all();

  const out = [];
  for (const r of rows) {
    if (excludeBonId != null && r.bon_id === excludeBonId) continue;
    const start = ymd(r.start_date);
    const ret = ymd(r.return_date);
    if (!start || !ret) continue;
    const overdue = r.status === 'active' && ret <= today;
    // Te laat: bezet t/m vandaag (dus einde = morgen, halfopen).
    const end = overdue && addDays(today, 1) > ret ? addDays(today, 1) : ret;
    out.push({
      kind: r.material_id != null ? 'material' : 'set',
      item_id: r.material_id ?? r.set_id,
      quantity: r.quantity,
      start,
      end,
      bon_id: r.bon_id,
      bon_number: r.bon_number,
      status: r.status,
      return_date: ret,
      overdue,
      holder: r.user_name || (r.external_org ? `Extern: ${r.external_org}` : 'Onbekend'),
      user_id: r.user_id,
    });
  }
  return out;
}

function groupByItem(occ) {
  const map = new Map();
  for (const o of occ) {
    const key = `${o.kind}:${o.item_id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(o);
  }
  return map;
}

// Per item: vrij per dag, minimum over de periode en wie het heeft.
function evaluateItem(item, occList, days) {
  const outOfService = item.available_status === 'out_of_service';
  const stock = Math.max(0, item.stock || 0);
  const perDay = days.map((d) => {
    let used = 0;
    for (const o of occList) if (o.start <= d && d < o.end) used += o.quantity;
    return { date: d, used, free: outOfService ? 0 : Math.max(0, stock - used) };
  });
  const available = perDay.length ? Math.min(...perDay.map((p) => p.free)) : (outOfService ? 0 : stock);
  const first = days[0];
  const lastExclusive = days.length ? addDays(days[days.length - 1], 1) : first;
  const holders = occList
    .filter((o) => o.start < lastExclusive && first < o.end)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .map((o) => ({
      bon_number: o.bon_number,
      holder: o.holder,
      quantity: o.quantity,
      start_date: o.start,
      return_date: o.return_date,
      status: o.status,
      overdue: o.overdue,
    }));
  return { stock, out_of_service: outOfService, available, days: perDay, holders };
}

// Beschikbaarheid van alle materialen en sets voor een periode.
// start/end = YYYY-MM-DD, end = retourdag (exclusief).
function computeAvailability({ start, end, excludeBonId = null } = {}) {
  const s = ymd(start) || todayNL();
  const e = ymd(end) || addDays(s, 1);
  const days = daysIn(s, e);
  const byItem = groupByItem(loadOccupancy(excludeBonId));
  const materials = {};
  for (const m of db.prepare('SELECT id, stock, available_status FROM materials').all()) {
    materials[m.id] = evaluateItem(m, byItem.get(`material:${m.id}`) || [], days);
  }
  const sets = {};
  for (const st of db.prepare('SELECT id, stock, available_status FROM sets').all()) {
    sets[st.id] = evaluateItem(st, byItem.get(`set:${st.id}`) || [], days);
  }
  return { start: s, end: e, handover: handoverTimes(), materials, sets };
}

// Controle bij aanmaken/wijzigen. Zelfde uitvoervorm als de oude checkStock:
// een lijst conflicten (leeg = alles past).
function checkStock(items, period, excludeBonId = null) {
  const aggregated = new Map();
  for (const it of items) {
    const kind = it.material_id != null ? 'material' : 'set';
    const id = it.material_id ?? it.set_id;
    const key = `${kind}:${id}`;
    if (!aggregated.has(key)) aggregated.set(key, { kind, id, quantity: 0 });
    aggregated.get(key).quantity += it.quantity;
  }
  if (aggregated.size === 0) return [];

  const s = ymd(period.start_date);
  const e = ymd(period.return_date);
  const days = daysIn(s, e);
  const byItem = groupByItem(loadOccupancy(excludeBonId));

  const conflicts = [];
  for (const req of aggregated.values()) {
    const table = req.kind === 'material' ? 'materials' : 'sets';
    const idCol = req.kind === 'material' ? 'material_id' : 'set_id';
    const nameCol = req.kind === 'material' ? 'material_name' : 'set_name';
    const item = db.prepare(`SELECT id, name, stock, available_status FROM ${table} WHERE id = ?`).get(req.id);
    if (!item) {
      conflicts.push({ [idCol]: req.id, [nameCol]: null, gevraagd: req.quantity, beschikbaar: 0,
        reden: `${req.kind === 'material' ? 'materiaal' : 'set'} bestaat niet` });
      continue;
    }
    if (item.available_status === 'out_of_service') {
      conflicts.push({ [idCol]: req.id, [nameCol]: item.name, gevraagd: req.quantity, beschikbaar: 0,
        reden: 'buiten dienst (kwijt/kapot)' });
      continue;
    }
    const ev = evaluateItem(item, byItem.get(`${req.kind}:${req.id}`) || [], days);
    if (req.quantity > ev.available) {
      const blocked = ev.days.filter((d) => d.free < req.quantity).map((d) => d.date);
      conflicts.push({
        [idCol]: req.id,
        [nameCol]: item.name,
        gevraagd: req.quantity,
        beschikbaar: ev.available,
        dagen_te_weinig: blocked,
        bezet_door: ev.holders.map((h) => `${h.holder} (${h.quantity}x t/m ${h.return_date})`),
      });
    }
  }
  return conflicts;
}

module.exports = {
  computeAvailability, checkStock, handoverTimes, todayNL, addDays, ymd,
  TIME_RE, DEFAULT_RETURN_BEFORE, DEFAULT_PICKUP_FROM,
};
