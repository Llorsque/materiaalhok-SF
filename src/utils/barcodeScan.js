import { useEffect, useRef } from "react";

// Detecteert een barcode-scan als globale keydown-reeks.
//
// Idee: een handscanner tikt tekens razendsnel achter elkaar in en sluit af
// met Enter. Handmatig typen is per definitie langzamer. We buffer'en dus
// alles op window-niveau; alleen wanneer bij Enter álle karaktergaps onder
// `charGapMs` zaten én de buffer minstens `minLength` tekens telt, gaan we
// ervan uit dat het een scan was en roepen we `onScan(buffer)` aan. Overige
// Enter's laten we ongemoeid (die doen niks extra in filter-inputs).
//
// Bewust minder agressief dan de LoginView-variant: we stelen de focus niet
// terug en blokkeren normale toetsen niet. Zo blijft handmatig typen in het
// filterveld gewoon filteren.
export function useGlobalBarcodeScan(onScan, {
  minLength = 3,
  charGapMs = 30,
  sessionResetMs = 500,
  active = true,
} = {}) {
  const cbRef = useRef(onScan);
  useEffect(() => { cbRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let buffer = "";
    let gaps = [];
    let lastTs = 0;
    const reset = () => { buffer = ""; gaps = []; lastTs = 0; };

    const handler = (e) => {
      const key = e.key;
      const now = Date.now();

      if (key === "Enter") {
        if (buffer.length >= minLength && gaps.every((g) => g <= charGapMs)) {
          const code = buffer;
          reset();
          e.preventDefault();
          e.stopPropagation();
          if (cbRef.current) cbRef.current(code);
          return;
        }
        // Geen scan-worthy buffer: gewoon resetten en Enter door laten.
        reset();
        return;
      }

      // Printbare single-char toetsen zonder Ctrl/Alt/Meta bouwen de buffer op.
      if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const gap = lastTs ? now - lastTs : 0;
        if (!lastTs || gap > sessionResetMs) {
          buffer = key;
          gaps = [];
        } else {
          buffer += key;
          gaps.push(gap);
        }
        lastTs = now;
        return;
      }

      // Modifier-toetsen laten we passeren; andere navigatie/edit-toetsen
      // (Backspace, Tab, pijltjes) breken de scansessie af.
      if (key !== "Shift" && key !== "CapsLock" && key !== "Alt" && key !== "Control" && key !== "Meta") {
        reset();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [active, minLength, charGapMs, sessionResetMs]);
}
