export function Swatches({ hexes, size = 22 }: { hexes: string[]; size?: number }) {
  return (
    <span className="inline-flex -space-x-1.5">
      {hexes.map((h, i) => (
        <span key={i} className="inline-block rounded-full border-2 border-white ring-1 ring-ink/20" style={{ background: h, width: size, height: size }} title={h} />
      ))}
    </span>
  );
}
