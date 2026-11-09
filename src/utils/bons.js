// Helpers die de frontend gebruikt om bons-state (uit de backend) te
// interpreteren. Belangrijk verschil met v1: `returned` en `picked_up` zijn
// per bon-item booleans (0/1), niet langer een count. Een lijn is óf
// volledig open, óf volledig retour/opgehaald.
//
// Ronde B: bon_items met removed_at_pickup=1 zijn soft-deleted — die stonden
// wel op de reservering maar zijn bij ophalen niet meegenomen. Ze tellen
// nergens meer mee (beschikbaarheid, retour, samenvatting) en blijven
// uitsluitend bestaan voor de audit-trail in het admin bon-detail.
const isActiveBonItem = (it) => it && it.removed_at_pickup !== 1;

// v2: de leen-, reserveer- en ophaalschermen vragen de beschikbaarheid aan
// de server (GET /api/availability, zie server/availability.js). De helpers
// hieronder worden alleen nog gebruikt voor de admin-overzichten "vandaag"
// (admins krijgen alle bonnen binnen). Ze volgen dezelfde regels als de
// server:
//   * een bon bezet de dagen [start_date, return_date) — de retourdag zelf
//     is vrij dankzij de vaste overdrachtstijden;
//   * een actieve bon die te laat is, bezet het materiaal t/m vandaag.
//
// Als er geen periode wordt meegegeven, geldt "vandaag".
function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// periode = de dagen startDate t/m returnDate (inclusief, zoals de admin-
// lijsten het bedoelen: "vandaag" = start=ret=vandaag).
function bonOverlapsPeriod(b, startDate, returnDate) {
  // Ontbrekende datums op een bon zouden alles kunnen matchen; behandel ze
  // defensief als "telt niet mee".
  if (!b.start_date || !b.return_date) return false;
  const s = b.start_date.slice(0, 10);
  let end = b.return_date.slice(0, 10); // exclusief
  const t = todayYmd();
  if (b.status === "active" && end <= t) end = addDay(t); // te laat: bezet t/m vandaag
  return s <= returnDate && end > startDate;
}

function addDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function normalizePeriod(startDate, returnDate) {
  const today = todayYmd();
  const start = startDate || today;
  const ret = returnDate || start;
  return { start, ret };
}

// De optionele 5e arg (opts) spiegelt de excludeBonId-parameter van backend
// checkStock: bij het "extra materiaal toevoegen aan een lopende bon" willen
// we die bon zelf uit de bezetting halen — zijn eigen items tellen tenslotte
// al mee via de eigen state (originele items + cart) in PickupFlow.
export function loanedQty(bons, materialId, startDate, returnDate, opts) {
  const { start, ret } = normalizePeriod(startDate, returnDate);
  const excludeBonId = opts?.excludeBonId ?? null;
  let total = 0;
  for (const b of bons) {
    if (b.status !== "active") continue;
    if (excludeBonId != null && b.id === excludeBonId) continue;
    if (!bonOverlapsPeriod(b, start, ret)) continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.material_id === materialId && !it.returned) total += it.quantity;
    }
  }
  return total;
}

export function reservedQty(bons, materialId, startDate, returnDate, opts) {
  const { start, ret } = normalizePeriod(startDate, returnDate);
  const excludeBonId = opts?.excludeBonId ?? null;
  let total = 0;
  for (const b of bons) {
    if (b.status !== "reserved") continue;
    if (excludeBonId != null && b.id === excludeBonId) continue;
    if (!bonOverlapsPeriod(b, start, ret)) continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.material_id === materialId) total += it.quantity;
    }
  }
  return total;
}

export function unavailableQty(bons, materialId, startDate, returnDate, opts) {
  return (
    loanedQty(bons, materialId, startDate, returnDate, opts) +
    reservedQty(bons, materialId, startDate, returnDate, opts)
  );
}

export function availQty(item, bons, startDate, returnDate, opts) {
  // Ronde B blok 2: buitendienst-materialen zijn niet beschikbaar, ongeacht
  // stock. Voor unieke items die kwijt/kapot zijn is dit hoe ze uit de
  // beschikbare voorraad verdwijnen tot een admin ze afhandelt.
  if (item && item.available_status === 'out_of_service') return 0;
  return Math.max(
    0,
    (item.stock || 0) - unavailableQty(bons, item.id, startDate, returnDate, opts),
  );
}

// Set-varianten: identieke logica maar tegen set_id in bon_items.
export function loanedSetQty(bons, setId, startDate, returnDate, opts) {
  const { start, ret } = normalizePeriod(startDate, returnDate);
  const excludeBonId = opts?.excludeBonId ?? null;
  let total = 0;
  for (const b of bons) {
    if (b.status !== "active") continue;
    if (excludeBonId != null && b.id === excludeBonId) continue;
    if (!bonOverlapsPeriod(b, start, ret)) continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.set_id === setId && !it.returned) total += it.quantity;
    }
  }
  return total;
}

export function reservedSetQty(bons, setId, startDate, returnDate, opts) {
  const { start, ret } = normalizePeriod(startDate, returnDate);
  const excludeBonId = opts?.excludeBonId ?? null;
  let total = 0;
  for (const b of bons) {
    if (b.status !== "reserved") continue;
    if (excludeBonId != null && b.id === excludeBonId) continue;
    if (!bonOverlapsPeriod(b, start, ret)) continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.set_id === setId) total += it.quantity;
    }
  }
  return total;
}

export function unavailableSetQty(bons, setId, startDate, returnDate, opts) {
  return (
    loanedSetQty(bons, setId, startDate, returnDate, opts) +
    reservedSetQty(bons, setId, startDate, returnDate, opts)
  );
}

export function availSetQty(item, bons, startDate, returnDate, opts) {
  if (item && item.available_status === 'out_of_service') return 0;
  return Math.max(
    0,
    (item.stock || 0) - unavailableSetQty(bons, item.id, startDate, returnDate, opts),
  );
}

// v2: de retourdeadline is de instelbare inlevertijd (standaard 12:00)
// Europe/Amsterdam op de return_date. App.jsx zet de waarde na het inloggen
// via setReturnDeadline(). Tot v1.20.4 was dit vast 18:00.
let RETURN_H = 12, RETURN_M = 0;
export function setReturnDeadline(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (m) { RETURN_H = +m[1]; RETURN_M = +m[2]; }
}
export function returnDeadlineLabel() {
  return `${String(RETURN_H).padStart(2, "0")}:${String(RETURN_M).padStart(2, "0")}`;
}
// Oorspronkelijke toelichting: een bon met return_date "2026-09-01" mag die
// dag tot de deadline nog worden ingeleverd, pas daarna is 'ie te laat. Zonder deze zone-bewuste vergelijking zou
// `new Date("2026-09-01")` als 00:00 UTC (= 02:00 CEST) worden gelezen en
// zou de bon al vanaf 02:00 's nachts te laat lijken. Werkt DST-veilig via
// Intl.DateTimeFormat — nooit een hardgecodeerde offset gebruiken.
function deadlineEpochMs(ymd, hour, minute = 0) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  // Truc: bereken wat de Amsterdamse klok aanwijst als we het "lokale" moment
  // per ongeluk als UTC interpreteren. Het verschil is precies de offset op
  // dat moment, en die trekken we er af om terug te schalen naar echte UTC.
  const guess = Date.UTC(y, mo - 1, d, hour, minute, 0);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(guess)).reduce((a, p) => {
    if (p.type !== 'literal') a[p.type] = p.value;
    return a;
  }, {});
  const amsAsUtc = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    +parts.hour, +parts.minute, +parts.second,
  );
  return guess - (amsAsUtc - guess);
}

export function bonIsOverdue(b) {
  if (!b || b.status === "completed") return false;
  if (!b.return_date) return false;
  const deadline = deadlineEpochMs(b.return_date, RETURN_H, RETURN_M);
  if (deadline == null) return false;
  return Date.now() > deadline;
}

export function bonRemaining(b) {
  return (b.items || []).filter((it) => isActiveBonItem(it) && !it.returned);
}

export function bonComplete(b) {
  const items = (b.items || []).filter(isActiveBonItem);
  return items.length > 0 && items.every((it) => it.returned);
}

// Publiek: filter voor UI-lijsten die soft-deleted items moeten weglaten
// (dus overal behalve het admin bon-detail).
export function bonActiveItems(b) {
  return (b.items || []).filter(isActiveBonItem);
}

// Toon-naam voor een bon_item: materialen hebben material_name, sets set_name.
export function itemDisplayName(it) {
  return it.material_name || it.set_name || "(onbekend)";
}

// genBonNr is bewust verwijderd: backend genereert BON-YYYY-NNNN bij POST.

export function genLoginCode() {
  return "USR" + String(Math.floor(Math.random() * 99999) + 10000);
}

// ── Externe verhuur ────────────────────────────────────────────────────────
// Helpers rond externe bonnen (v1.15.0). Interne bonnen vallen buiten deze
// checks; ze zijn nooit "wacht op betaling" en hebben geen fase-tekst.
//
// De fase-tekst spiegelt wat BonDetailModal toont, zodat het dashboard en
// de bel dezelfde taal gebruiken als het detail. Losstaande logica is
// bewust vermeden: eventuele wijzigingen aan de fasering wilden we op één
// plek doen.

export function isExternalOpen(b) {
  return !!(b && b.is_external && b.status !== "completed");
}

// Alle niet-soft-deleted items binnen? Basis voor "materiaal retour"-checks.
function externalAllReturned(b) {
  const items = (b.items || []).filter(isActiveBonItem);
  return items.length > 0 && items.every((it) => it.returned === 1);
}

// Kernwaarschuwing van de sub-roadmap: materiaal is binnen maar de admin
// moet nog een betaling verwerken. Blokkeert de bon van 'completed'.
export function isExternalWaitingOnPayment(b) {
  if (!b || !b.is_external) return false;
  if (b.status !== "active") return false;
  if (b.payment_status !== "open") return false;
  return externalAllReturned(b);
}

// Korte, spreektaal-fase-omschrijving voor een externe bon. Retourneert een
// lege string voor niet-externe bonnen of bonnen zonder relevante fase.
export function externalPhaseLabel(b) {
  if (!b || !b.is_external) return "";
  const payOpen = b.payment_status === "open";
  const payPaid = b.payment_status === "paid";
  const allBack = externalAllReturned(b);
  if (b.status === "completed") return "Afgehandeld";
  if (b.status === "reserved") {
    if (payPaid) return "Betaald, wacht op ophalen";
    if (payOpen) return "Wacht op ophalen en betaling";
    return "Wacht op ophalen";
  }
  if (b.status === "active") {
    if (allBack && payOpen) return "Materiaal retour, wacht op betaling";
    if (allBack && payPaid) return "Materiaal retour, wordt afgerond";
    if (!allBack && payPaid) return "Betaald, wacht op retour";
    if (!allBack && payOpen) return "Wacht op retour en betaling";
    return "Materiaal uit";
  }
  return "";
}
