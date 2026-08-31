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

// v1.20.0: beschikbaarheid is datum-afhankelijk. Een bon telt alleen mee
// als hij OVERLAPT met de gevraagde periode.
//
// LET OP — SYNCHRONISATIE VERPLICHT met backend checkStock() in
// server/routes/bons.js (rond regel 120-131). De overlap-regel is:
//   status IN ('active','reserved')
//   AND b.start_date <= period.return_date
//   AND b.return_date >= period.start_date
// (inclusieve grenzen; de leendag en retourdag tellen als bezet). Bij
// aanpassing van deze regel moet OOK checkStock bijgewerkt worden — anders
// tonen we op de frontend andere getallen dan wat de backend weigert.
//
// Als er geen periode wordt meegegeven, geldt "vandaag" (start=return=today).
// Dat is wat het dashboard en de admin-lijsten tonen onder het label
// "Beschikbaar".
function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function bonOverlapsPeriod(b, startDate, returnDate) {
  // Ontbrekende datums op een bon zouden alles kunnen matchen; behandel ze
  // defensief als "telt niet mee" — bons zonder datums horen niet voor te
  // komen (backend valideert bij POST) maar we willen geen spookbezetting.
  if (!b.start_date || !b.return_date) return false;
  return b.start_date <= returnDate && b.return_date >= startDate;
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

export function bonIsOverdue(b) {
  if (!b || b.status === "completed") return false;
  if (!b.return_date) return false;
  return new Date(b.return_date) < new Date();
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
