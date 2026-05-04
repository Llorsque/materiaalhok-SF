import { encodeCode128B } from "../utils/barcode";

export function BarcodeSVG({ code, name, small }) {
  if (!code) return null;
  const modules = encodeCode128B(code);
  if (!modules) return null;
  const moduleW = small ? 1.5 : 2.2;
  const qz = 15;
  const w = modules.length * moduleW + qz * 2;
  const h = small ? 45 : 70;
  const rects = [];
  let x = qz;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') rects.push(<rect key={i} x={x} y={4} width={moduleW} height={h} fill="black"/>);
    x += moduleW;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h + (small ? 20 : 32)}`} width={w} height={h + (small ? 20 : 32)} style={{background:"white"}}>
      <rect width={w} height={h + (small ? 20 : 32)} fill="white"/>
      {rects}
      <text x={w/2} y={h + (small ? 15 : 20)} textAnchor="middle" fontSize={small ? 11 : 14} fontFamily="monospace" fontWeight="bold">{code}</text>
      {!small && name && <text x={w/2} y={h + 31} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill="#666">{name.length > 35 ? name.slice(0,32) + "..." : name}</text>}
    </svg>
  );
}
