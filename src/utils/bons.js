export function loanedQty(bons, itemId) {
  let t = 0;
  bons.forEach(b => { if (b.status === "active") b.items.forEach(i => { if (i.itemId === itemId) t += (i.qty - (i.returned || 0)); }); });
  return t;
}

export function reservedQty(bons, itemId, startDate, endDate) {
  let t = 0;
  bons.forEach(b => {
    if (b.status === "reserved" && !(b.endDate < startDate || b.startDate > endDate)) {
      b.items.forEach(i => { if (i.itemId === itemId) t += i.qty; });
    }
  });
  return t;
}

export function unavailableQty(bons, itemId) {
  let t = 0;
  bons.forEach(b => { if (b.status !== "completed") b.items.forEach(i => { if (i.itemId === itemId) t += (i.qty - (i.returned || 0)); }); });
  return t;
}

export function availQty(item, bons) { return item.stock - unavailableQty(bons, item.id) - (item.maintenance || 0); }
export function bonIsOverdue(b) { return b.status !== "completed" && b.endDate && new Date(b.endDate) < new Date(); }
export function bonRemaining(b) { return b.items.filter(i => (i.qty - (i.returned || 0)) > 0); }
export function bonComplete(b) { return b.items.every(i => (i.returned || 0) >= i.qty); }

export function genBonNr() { const d = new Date(); return `BON-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`; }
export function genLoginCode() { return "USR" + String(Math.floor(Math.random() * 99999) + 10000); }
