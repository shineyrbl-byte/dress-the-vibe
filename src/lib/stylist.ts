import { clamp, describe, hexToHsl, hslToHex, temperature, type HSL } from "./color";
import type { Look, MakeupEffect, Outfit, RecipeLine } from "./types";
import type { Vibe } from "./vibes";

// Pattern names come from YouCam's pattern catalogs (plugins-media.makeupar.com/wcm-saas/patterns/*.json).
const LINER: Record<Exclude<Vibe["liner"], "none">, { pattern: string; colors: number }> = {
  tight: { pattern: "OpenWings1", colors: 1 },
  wing: { pattern: "OpenWings3", colors: 1 },
  drama: { pattern: "2colors1", colors: 2 },
  smoke: { pattern: "Smoke4", colors: 1 },
};
const SHADOW: Record<Vibe["shadow"], string> = {
  wash: "2colors12",
  lid: "2colors1",
  smokey: "2colors4",
  crease: "2colors167",
};
const BLUSH: Record<Vibe["blushShape"], string> = { soft: "1color2", lifted: "Oblique1", sweet: "Heart1" };

/** The outfit's statement color, or null when it's all neutrals (black, white, grey, beige). */
export function statementColor(outfit: Outfit): { hex: string; hsl: HSL } | null {
  for (const c of outfit.colors) {
    const hsl = hexToHsl(c.hex);
    if (hsl.s > 0.28 && hsl.l > 0.15 && hsl.l < 0.85 && c.share > 0.12) return { hex: c.hex, hsl };
  }
  return null;
}

/** How well an outfit fits a vibe. Used to fill the rack and for "surprise me". */
export function scoreOutfit(outfit: Outfit, vibe: Vibe) {
  let score = vibe.categories.includes(outfit.category) ? 3 - vibe.categories.indexOf(outfit.category) * 0.4 : 0;
  const title = outfit.title.toLowerCase();
  score += vibe.titleHints.filter((h) => title.includes(h)).length * 1.5;
  const main = outfit.colors[0] ? hexToHsl(outfit.colors[0].hex) : null;
  if (main) {
    // Loud vibes like saturated outfits, calm vibes like soft ones.
    score += vibe.intensity > 0.7 ? main.s * 1.5 : (1 - main.s) * 0.8;
    if (vibe.id === "villain" || vibe.id === "date-night") score += (1 - main.l) * 1.2;
  }
  return score;
}

export function rackFor(outfits: Outfit[], vibe: Vibe, style: "all" | Outfit["style"], size = 12) {
  return outfits
    .filter((o) => style === "all" || o.style === style)
    .map((o) => ({ o, s: scoreOutfit(o, vibe) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, size)
    .map((x) => x.o);
}

const isWarm = (h: number) => h < 50 || h >= 345;

/**
 * Builds the makeup look. The rules are classic color theory:
 * echo a warm statement color on the lips, let a cool outfit be balanced by the vibe's
 * signature lip, and make the lip the statement when the outfit is all neutrals.
 * `variant` nudges hue/lightness so "remix" gives a related but different look.
 */
export function buildLook(vibe: Vibe, outfit: Outfit, variant = 0): Look {
  const accent = statementColor(outfit);
  const i = vibe.intensity;
  const shift = [0, 14, -14, 26, -26][variant % 5];
  const lift = [0, 0.05, -0.04, 0.08, -0.06][variant % 5];
  const recipe: RecipeLine[] = [];
  const effects: MakeupEffect[] = [];

  // ---- Lips
  const sig = hexToHsl(vibe.lip.signature);
  let lip: HSL;
  let lipWhy: string;
  if (!accent) {
    lip = sig;
    const main = describe(outfit.colors[0]?.hex ?? "#222222");
    lipWhy = /black|white|grey|charcoal|beige|brown/.test(main)
      ? `Your outfit is mostly ${main}, so the lip gets to be the statement piece.`
      : `Your outfit's colors are soft and muted (mostly ${main}), so the lip gets to be the statement piece.`;
  } else if (vibe.lip.strategy === "echo" && isWarm(accent.hsl.h)) {
    lip = { h: accent.hsl.h, s: clamp(accent.hsl.s, 0.55, 0.85), l: clamp(0.5 - i * 0.18, 0.28, 0.5) };
    lipWhy = `Echoes the ${describe(accent.hex)} in your outfit, pulled a shade deeper so it reads as lipstick, not costume.`;
  } else if (vibe.lip.strategy === "contrast" && isWarm(accent.hsl.h)) {
    lip = { ...sig, h: (sig.h + 350) % 360 };
    lipWhy = `A cooler rose so your lips don't compete with the ${describe(accent.hex)} outfit.`;
  } else {
    lip = sig;
    lipWhy = `A ${isWarm(sig.h) ? "warm" : "cool"} ${vibe.name.toLowerCase()} classic that ${temperature(accent.hsl) === "cool" ? "pops against" : "sits nicely with"} the ${describe(accent.hex)} of your outfit.`;
  }
  lip = { h: (lip.h + shift + 360) % 360, s: lip.s, l: clamp(lip.l + lift, 0.2, 0.62) };
  const lipHex = hslToHex(lip);
  const lipFinish = vibe.lip.finish;
  effects.push({
    category: "lip_color",
    shape: { name: "original" },
    style: { type: "full" },
    palettes: [
      {
        color: lipHex,
        texture: lipFinish,
        colorIntensity: Math.round(45 + i * 40),
        ...(lipFinish === "gloss" ? { gloss: 60, transparencyIntensity: 25 } : {}),
        ...(lipFinish === "sheer" ? { transparencyIntensity: 45 } : {}),
      },
    ],
  });
  recipe.push({ part: "Lips", shade: shadeName("lip", lip, vibe), hexes: [lipHex], finish: lipFinish, why: lipWhy });

  // ---- Eyes
  const warmBase = isWarm(lip.h);
  const base: HSL = warmBase ? { h: 28, s: 0.35, l: clamp(0.62 - i * 0.12, 0.45, 0.66) } : { h: 320, s: 0.18, l: clamp(0.6 - i * 0.12, 0.45, 0.64) };
  const deep: HSL =
    accent && i >= 0.7
      ? { h: accent.hsl.h, s: clamp(accent.hsl.s, 0.35, 0.7), l: clamp(0.3 - (i - 0.7) * 0.4, 0.16, 0.32) }
      : warmBase
        ? { h: 20, s: 0.3, l: clamp(0.42 - i * 0.18, 0.2, 0.42) }
        : { h: 300, s: 0.15, l: clamp(0.4 - i * 0.18, 0.2, 0.4) };
  const baseHex = hslToHex(base);
  const deepHex = hslToHex(deep);
  effects.push({
    category: "eye_shadow",
    pattern: { name: SHADOW[vibe.shadow] },
    palettes: [
      { color: baseHex, texture: "matte", colorIntensity: Math.round(30 + i * 35) },
      { color: deepHex, texture: "matte", colorIntensity: Math.round(30 + i * 45) },
    ],
  });
  recipe.push({
    part: "Eyes",
    shade: shadeName("eye", deep, vibe),
    hexes: [baseHex, deepHex],
    finish: { wash: "soft wash", lid: "lid-only", smokey: "smoked out", crease: "cut crease" }[vibe.shadow],
    why:
      accent && i >= 0.7
        ? `The deep shade is your outfit's ${describe(accent.hex)}, darkened, so eyes and outfit read as one look.`
        : `${warmBase ? "Warm bronze" : "Soft mauve"} tones that match the ${warmBase ? "warmth" : "coolness"} of the lip.`,
  });

  if (vibe.liner !== "none") {
    const l = LINER[vibe.liner];
    const pop = accent ? hslToHex({ ...accent.hsl, l: clamp(accent.hsl.l, 0.35, 0.55) }) : "#3A2A2A";
    effects.push({
      category: "eye_liner",
      pattern: { name: l.pattern },
      palettes: [
        { color: "#141414", texture: "matte", colorIntensity: Math.round(50 + i * 35) },
        ...(l.colors === 2 ? [{ color: pop, texture: "matte", colorIntensity: 60 }] : []),
      ],
    });
    recipe.push({
      part: "Liner",
      shade: { tight: "Clean Line", wing: "Soft Wing", drama: "Double Trouble", smoke: "Smudge Report" }[vibe.liner],
      hexes: l.colors === 2 ? ["#141414", pop] : ["#141414"],
      finish: { tight: "tight line", wing: "winged", drama: "graphic double wing", smoke: "smudged" }[vibe.liner],
      why: l.colors === 2 && accent ? `A second wing in your outfit's ${describe(accent.hex)}. Festival rules.` : "Defines the eyes without fighting the lip.",
    });
  }

  // ---- Cheeks: same temperature as the lip, softer.
  const blush: HSL = { h: warmBase ? 12 : 345, s: 0.5, l: 0.66 };
  const blushHex = hslToHex(blush);
  effects.push({
    category: "blush",
    pattern: { name: BLUSH[vibe.blushShape] },
    palettes: [{ color: blushHex, texture: "matte", colorIntensity: Math.round(25 + i * 25) }],
  });
  recipe.push({
    part: "Cheeks",
    shade: shadeName("blush", blush, vibe),
    hexes: [blushHex],
    finish: { soft: "soft round", lifted: "lifted", sweet: "sweet heart" }[vibe.blushShape],
    why: `${warmBase ? "Peachy" : "Rosy"} to stay in the same color family as the lip.`,
  });

  return {
    vibeId: vibe.id,
    outfitId: outfit.id,
    variant,
    effects,
    recipe,
    headline: `${outfit.title} × ${shadeName("lip", lip, vibe)}`,
  };
}

const NOUNS: Record<string, string[]> = {
  red: ["Encore", "Verdict", "Overture", "Plot Twist"],
  pink: ["Crush", "Bubble", "Daydream", "Mixtape"],
  coral: ["Sunday", "Spritz", "Postcard", "Picnic"],
  brown: ["Chapter", "Latte", "Velvet", "Rumor"],
  berry: ["Monologue", "Secret", "After Hours", "Encore"],
  plum: ["Prophecy", "Curse", "Eclipse", "Omen"],
  nude: ["Memo", "Agenda", "Signature", "Bottom Line"],
};
const ADJ: Record<string, string[]> = {
  "date-night": ["Merlot", "Candlelit", "Velvet", "Smoky"],
  "farmers-market": ["Peach", "Honey", "Sunlit", "Apricot"],
  corporate: ["Executive", "Quiet", "Tailored", "Power"],
  festival: ["Neon", "Glitter", "Electric", "Cosmic"],
  cafe: ["Cinnamon", "Mocha", "Toasted", "Maple"],
  "wedding-guest": ["Petal", "Blush", "Champagne", "Peony"],
  villain: ["Midnight", "Hex", "Obsidian", "Poison"],
  holiday: ["Cranberry", "Gilded", "Tinsel", "Mulled"],
};

function family(c: HSL) {
  if (c.l < 0.3 && (c.h >= 280 || c.h < 10)) return c.h >= 300 || c.h < 10 ? "berry" : "plum";
  if (c.s < 0.4) return c.l < 0.5 ? "brown" : "nude";
  if (c.h >= 10 && c.h < 40) return c.l > 0.5 ? "coral" : "brown";
  if (c.h >= 290 && c.h < 345) return "pink";
  if (c.h >= 200 && c.h < 290) return "plum";
  return "red";
}

function shadeName(kind: "lip" | "eye" | "blush", c: HSL, vibe: Vibe) {
  const seed = Math.round(c.h + c.l * 100);
  const adj = ADJ[vibe.id][seed % 4];
  if (kind === "eye") return `${adj} ${["Smoke", "Haze", "Dusk", "Shadow"][seed % 4]}`;
  if (kind === "blush") return `${adj} ${["Flush", "Glow", "Blush", "Heat"][seed % 4]}`;
  return `${adj} ${NOUNS[family(c)][seed % 4]}`;
}
