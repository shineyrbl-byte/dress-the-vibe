export interface HSL {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

export function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export type Temperature = "warm" | "cool" | "neutral";

export function temperature(c: HSL): Temperature {
  if (c.s < 0.18) return "neutral";
  return c.h < 70 || c.h >= 330 ? "warm" : c.h >= 160 && c.h < 300 ? "cool" : c.h < 160 ? "warm" : "cool";
}

const HUE_NAMES: [number, string][] = [
  [15, "red"], [40, "orange"], [65, "yellow"], [160, "green"], [200, "teal"], [255, "blue"], [290, "purple"], [330, "pink"], [361, "red"],
];

export function describe(hex: string): string {
  const c = hexToHsl(hex);
  if (c.l < 0.14) return "black";
  if (c.l > 0.88 && c.s < 0.3) return "white";
  if (c.s < 0.15) return c.l > 0.6 ? "light grey" : c.l > 0.35 ? "grey" : "charcoal";
  if (c.s < 0.35 && c.h < 60 && c.l > 0.45) return "beige";
  if (c.h < 45 && c.l < 0.35) return "brown";
  const name = HUE_NAMES.find(([max]) => c.h < max)![1];
  return `${c.l < 0.3 ? "deep " : c.l > 0.72 ? "pastel " : ""}${name}`;
}
