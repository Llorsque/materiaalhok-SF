export function ItemPhoto({ photo, size }) {
  const s = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  if (photo) return <img src={photo} className={`${s} rounded-xl object-cover`} alt=""/>;
  return null;
}
