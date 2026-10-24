// Winding footprint trail connecting two stops on the adventure map.
export function Footprints({ flip }: { flip?: boolean }) {
  const d = flip ? "M200 0 C 200 30, 40 30, 40 70" : "M40 0 C 40 30, 200 30, 200 70";
  return (
    <svg viewBox="0 0 240 70" className="w-full h-14 -my-1" aria-hidden="true">
      <path d={d} fill="none" stroke="#b8964f" strokeOpacity=".55" strokeWidth="5" strokeDasharray="1 14" strokeLinecap="round" />
    </svg>
  );
}
