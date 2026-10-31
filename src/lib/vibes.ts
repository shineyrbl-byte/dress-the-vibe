// Each vibe is a styling brief: which outfits fit it, and how loud the makeup should be.

export type LinerStyle = "none" | "tight" | "wing" | "drama" | "smoke";
export type ShadowStyle = "wash" | "lid" | "smokey" | "crease";
export type LipStrategy = "echo" | "signature" | "contrast";

export interface Vibe {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  gradient: string; // tailwind-free inline CSS gradient for the card
  keywords: string[]; // for matching typed vibes
  categories: string[]; // YouCam outfit template categories that fit
  titleHints: string[]; // words in outfit titles that fit especially well
  intensity: number; // 0-1, how bold the makeup is
  lip: { strategy: LipStrategy; signature: string; finish: "matte" | "satin" | "gloss" | "sheer" };
  liner: LinerStyle;
  shadow: ShadowStyle;
  blushShape: "soft" | "lifted" | "sweet";
}

export const VIBES: Vibe[] = [
  {
    id: "date-night",
    name: "Jazz Bar Date Night",
    emoji: "🍷",
    tagline: "Low lights, red lips, zero small talk.",
    gradient: "linear-gradient(135deg,#3b0a1e,#9b1b30 60%,#f2a541)",
    keywords: ["date", "night", "romantic", "dinner", "jazz", "wine", "sexy", "sultry"],
    categories: ["Modern", "Feminine", "Holiday", "Urban Classic"],
    titleHints: ["black", "red", "satin", "silk", "lace", "velour", "midnight", "ruby", "slip", "gown"],
    intensity: 0.8,
    lip: { strategy: "echo", signature: "#8E1B2C", finish: "satin" },
    liner: "wing",
    shadow: "smokey",
    blushShape: "lifted",
  },
  {
    id: "farmers-market",
    name: "Sunday Farmers Market",
    emoji: "🧺",
    tagline: "Iced latte in one hand, peaches in the other.",
    gradient: "linear-gradient(135deg,#ffe29a,#ffa45c 55%,#7ec850)",
    keywords: ["sunday", "market", "brunch", "casual", "fresh", "picnic", "daytime", "weekend", "summer"],
    categories: ["Summer", "Everyday", "Casual"],
    titleHints: ["floral", "lemon", "citrus", "picnic", "sun", "breeze", "cotton", "linen", "blossom"],
    intensity: 0.35,
    lip: { strategy: "signature", signature: "#E8836B", finish: "sheer" },
    liner: "none",
    shadow: "wash",
    blushShape: "soft",
  },
  {
    id: "corporate",
    name: "Corporate Baddie",
    emoji: "💼",
    tagline: "Walks into the meeting. Is the meeting.",
    gradient: "linear-gradient(135deg,#1f2937,#4b5563 55%,#d6c6a8)",
    keywords: ["work", "office", "meeting", "interview", "boss", "corporate", "professional", "presentation"],
    categories: ["Urban Classic", "Everyday", "Modern", "Edgy"],
    titleHints: ["suit", "tailored", "shirt", "tweed", "classic", "sharp", "blazer", "preppy", "collar"],
    intensity: 0.5,
    lip: { strategy: "signature", signature: "#A8645C", finish: "matte" },
    liner: "tight",
    shadow: "lid",
    blushShape: "lifted",
  },
  {
    id: "festival",
    name: "Festival Chaos",
    emoji: "🎡",
    tagline: "Glitter is a personality trait.",
    gradient: "linear-gradient(135deg,#ff3cac,#784ba0 50%,#2b86c5)",
    keywords: ["festival", "concert", "rave", "party", "music", "colorful", "fun", "wild", "coachella"],
    categories: ["Summer", "Costume", "Edgy", "Modern"],
    titleHints: ["pop", "tropical", "neon", "metallic", "glitter", "color", "electric", "stellar", "samba", "fringe"],
    intensity: 1,
    lip: { strategy: "echo", signature: "#D6246E", finish: "gloss" },
    liner: "drama",
    shadow: "crease",
    blushShape: "sweet",
  },
  {
    id: "cafe",
    name: "Cozy Café Reader",
    emoji: "☕",
    tagline: "Third chapter, second cappuccino.",
    gradient: "linear-gradient(135deg,#6f4e37,#b08968 55%,#ede0d4)",
    keywords: ["cozy", "cafe", "coffee", "book", "reading", "chill", "autumn", "fall", "soft", "study"],
    categories: ["Everyday", "Casual", "Modern"],
    titleHints: ["knit", "sweater", "cream", "oat", "lounge", "argyle", "brown", "tweed", "cargo"],
    intensity: 0.3,
    lip: { strategy: "signature", signature: "#9C5B4E", finish: "satin" },
    liner: "none",
    shadow: "wash",
    blushShape: "soft",
  },
  {
    id: "wedding-guest",
    name: "Wedding Guest Glow",
    emoji: "💐",
    tagline: "Don't outshine the bride. Get close though.",
    gradient: "linear-gradient(135deg,#f9d5e5,#eeac99 55%,#c3aed6)",
    keywords: ["wedding", "guest", "gala", "formal", "elegant", "ceremony", "reception", "event"],
    categories: ["Wedding", "Modern", "Summer", "Cultural Attire"],
    titleHints: ["gown", "tulle", "floral", "satin", "lace", "gala", "midi", "maxi", "peony", "gold"],
    intensity: 0.55,
    lip: { strategy: "contrast", signature: "#C25B6E", finish: "satin" },
    liner: "tight",
    shadow: "lid",
    blushShape: "soft",
  },
  {
    id: "villain",
    name: "Villain Era",
    emoji: "🖤",
    tagline: "Not evil. Just done being nice.",
    gradient: "linear-gradient(135deg,#000000,#3a0f2e 55%,#7b2cbf)",
    keywords: ["villain", "dark", "goth", "edgy", "black", "grunge", "rock", "moody", "witch", "halloween"],
    categories: ["Edgy", "Costume", "Modern"],
    titleHints: ["black", "noir", "dark", "leather", "midnight", "ghost", "spell", "moto", "night"],
    intensity: 0.95,
    lip: { strategy: "signature", signature: "#4A0E2B", finish: "matte" },
    liner: "smoke",
    shadow: "smokey",
    blushShape: "lifted",
  },
  {
    id: "holiday",
    name: "Holiday Party Sparkle",
    emoji: "✨",
    tagline: "Mistletoe optional. Main character mandatory.",
    gradient: "linear-gradient(135deg,#0b3d2e,#b3001b 55%,#f4c95d)",
    keywords: ["holiday", "christmas", "new year", "nye", "festive", "sparkle", "december", "party", "winter"],
    categories: ["Holiday", "Modern", "Feminine"],
    titleHints: ["gold", "glitter", "red", "velvet", "tartan", "snow", "silver", "shimmer", "winter"],
    intensity: 0.75,
    lip: { strategy: "echo", signature: "#B3001B", finish: "satin" },
    liner: "wing",
    shadow: "lid",
    blushShape: "lifted",
  },
];

/** Picks the vibe that best matches free text, e.g. "brunch with my grandma". */
export function matchVibe(text: string): Vibe {
  const words = text.toLowerCase();
  let best = VIBES[0];
  let bestScore = -1;
  for (const v of VIBES) {
    const score = v.keywords.reduce((s, k) => s + (words.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : VIBES[Math.floor(Math.random() * VIBES.length)];
}

export const vibeById = (id: string) => VIBES.find((v) => v.id === id) ?? VIBES[0];
