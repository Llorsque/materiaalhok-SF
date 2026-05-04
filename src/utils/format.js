export const fmt = (n) => typeof n === "number" && n > 0 ? "\u20ac" + n.toFixed(2).replace(".", ",") : "-";

export const getIcon = (c) => ({ Atletiek: "\ud83c\udfc3", Circus: "\ud83c\udfaa", Racketsport: "\ud83c\udff8", "Ballen": "\ud83c\udfc0", "Sport sets": "\u26bd", Gymmateriaal: "\ud83e\udd38", Extra: "\ud83d\udce6" }[c] || "\ud83c\udfc5");

export function readFile(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}
