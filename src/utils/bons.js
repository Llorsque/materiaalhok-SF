// Helpers die de frontend gebruikt om bons-state (uit de backend) te
// interpreteren. Belangrijk verschil met v1: `returned` en `picked_up` zijn
// per bon-item booleans (0/1), niet langer een count. Een lijn is óf
// volledig open, óf volledig retour/opgehaald.

export function loanedQty(bons, materialId) {
  let total = 0;
  for (const b of bons) {
    if (b.status !== "active") continue;
    for (const it of b.items || []) {
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
      if (it.material_id === materialId) total += it.quantity;
    }
  }
  return total;
}

export function unavailableQty(bons, materialId) {
  return loanedQty(bons, materialId) + reservedQty(bons, materialId);
}

export function availQty(item, bons) {
  return Math.max(0, (item.stock || 0) - unavailableQty(bons, item.id));
}

export function bonIsOverdue(b) {
  if (!b || b.status === "completed") return false;
  if (!b.return_date) return false;
  return new Date(b.return_date) < new Date();
}

export function bonRemaining(b) {
  return (b.items || []).filter((it) => !it.returned);
}

export function bonComplete(b) {
  const items = b.items || [];
  return items.length > 0 && items.every((it) => it.returned);
}

// Toon-naam voor een bon_item: materialen hebben material_name, sets set_name.
export function itemDisplayName(it) {
  return it.material_name || it.set_name || "(onbekend)";
}

// genBonNr is bewust verwijderd: backend genereert BON-YYYY-NNNN bij POST.

export function genLoginCode() {
  return "USR" + String(Math.floor(Math.random() * 99999) + 10000);
}
