export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtDT = (d) => d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
export const today = () => new Date().toISOString().split("T")[0];
export const isoNow = () => new Date().toISOString();
