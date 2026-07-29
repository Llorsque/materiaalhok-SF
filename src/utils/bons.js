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

export function loanedQty(bons, materialId) {
  let total = 0;
  for (const b of bons) {
    if (b.status !== "active") continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.material_id === materialId && !it.returned) total += it.quantity;
    }
  }
  return total;
}

export function reservedQty(bons, materialId) {
  let total = 0;
  for (const b of bons) {
    if (b.status !== "reserved") continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.material_id === materialId) total += it.quantity;
    }
  }
  return total;
}

export function unavailableQty(bons, materialId) {
  return loanedQty(bons, materialId) + reservedQty(bons, materialId);
}

export function availQty(item, bons) {
  // Ronde B blok 2: buitendienst-materialen zijn niet beschikbaar, ongeacht
  // stock. Voor unieke items die kwijt/kapot zijn is dit hoe ze uit de
  // beschikbare voorraad verdwijnen tot een admin ze afhandelt.
  if (item && item.available_status === 'out_of_service') return 0;
  return Math.max(0, (item.stock || 0) - unavailableQty(bons, item.id));
}

// Set-varianten: identieke logica maar tegen set_id in bon_items.
export function loanedSetQty(bons, setId) {
  let total = 0;
  for (const b of bons) {
    if (b.status !== "active") continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.set_id === setId && !it.returned) total += it.quantity;
    }
  }
  return total;
}

export function reservedSetQty(bons, setId) {
  let total = 0;
  for (const b of bons) {
    if (b.status !== "reserved") continue;
    for (const it of b.items || []) {
      if (!isActiveBonItem(it)) continue;
      if (it.set_id === setId) total += it.quantity;
    }
  }
  return total;
}

export function unavailableSetQty(bons, setId) {
  return loanedSetQty(bons, setId) + reservedSetQty(bons, setId);
}

export function availSetQty(item, bons) {
  if (item && item.available_status === 'out_of_service') return 0;
  return Math.max(0, (item.stock || 0) - unavailableSetQty(bons, item.id));
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
