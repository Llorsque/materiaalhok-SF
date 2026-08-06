// Herbruikbare presentatie-primitieven voor de weergave-toggle
// (Lijst / Tiles) en de tile-grid. Bewust dun gehouden: de tabs
// blijven zelf verantwoordelijk voor filteren, click-gedrag en welke
// content in de tile komt. Zo kunnen Materiaal, Sets, Bonnen en
// Gebruikers straks allemaal hetzelfde patroon delen zonder dat we
// hun onderliggende logica hoeven te uniformeren.

const TONE_CLASSES = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber:   "bg-amber-100 text-amber-700",
  purple:  "bg-purple-100 text-purple-700",
  red:     "bg-red-100 text-red-700",
  blue:    "bg-blue-100 text-blue-700",
  gray:    "bg-gray-100 text-gray-700",
};

export function ViewToggle({ view, onChange, accent = "blue" }) {
  const activeClass = accent === "purple"
    ? "bg-purple-600 text-white"
    : "bg-blue-600 text-white";
  const inactiveClass = "text-gray-600 hover:bg-gray-200";
  return <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-medium" role="tablist" aria-label="Weergave">
    <button
      type="button"
      role="tab"
      aria-selected={view === "list"}
      onClick={() => onChange("list")}
      className={`px-3 py-1.5 rounded-lg transition ${view === "list" ? activeClass : inactiveClass}`}
    >Lijst</button>
    <button
      type="button"
      role="tab"
      aria-selected={view === "tiles"}
      onClick={() => onChange("tiles")}
      className={`px-3 py-1.5 rounded-lg transition ${view === "tiles" ? activeClass : inactiveClass}`}
    >Tiles</button>
  </div>;
}

export function TileGrid({ children }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
    {children}
  </div>;
}

export function Tile({
  onClick,
  media,
  title,
  titleClassName = "font-semibold text-gray-900 text-sm truncate",
  subtitle,
  badges = [],
  extra,
}) {
  return <div
    onClick={onClick}
    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 flex flex-col gap-3"
  >
    <div className="flex items-center gap-3 min-w-0">
      {media && <div className="flex-shrink-0">{media}</div>}
      <div className="min-w-0 flex-1">
        <p className={titleClassName}>{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
    {badges.length > 0 && <div className="flex flex-wrap gap-1.5 text-xs">
      {badges.map((b, i) => <span
        key={i}
        className={`px-2 py-0.5 rounded-full font-medium ${TONE_CLASSES[b.tone] || TONE_CLASSES.gray}`}
      >{b.text}</span>)}
    </div>}
    {extra}
  </div>;
}
