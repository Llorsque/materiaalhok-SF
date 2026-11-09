import { createElement } from "react";
import { Icon } from "../components/Icon";
export const fmt = (n) => typeof n === "number" && n > 0 ? "\u20ac" + n.toFixed(2).replace(".", ",") : "-";

// v2: categorie-icoon is een neutraal lijnicoontje (was: emoji per categorie).
export const getIcon = () => createElement(Icon, { name: "package", className: "text-slate-400" });

export function readFile(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}
