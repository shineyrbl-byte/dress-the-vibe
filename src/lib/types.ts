export interface Outfit {
  id: string; // YouCam clothes template id
  title: string;
  category: string;
  style: "feminine" | "masculine";
  thumb: string;
  colors: { hex: string; share: number }[];
}

export type Finish = "matte" | "satin" | "gloss" | "sheer";

export interface Palette {
  color: string;
  texture: string;
  colorIntensity: number;
  // Required by YouCam for gloss / sheer lip finishes.
  gloss?: number;
  transparencyIntensity?: number;
}

// One effect as sent to YouCam Makeup VTO (/s2s/v2.0/task/makeup-vto, version 1.0).
export interface MakeupEffect {
  category: "lip_color" | "blush" | "eye_shadow" | "eye_liner";
  pattern?: { name: string };
  shape?: { name: string };
  style?: { type: string };
  palettes: Palette[];
}

export interface RecipeLine {
  part: string; // "Lips", "Eyes"...
  shade: string; // fun shade name
  hexes: string[];
  finish: string;
  why: string;
}

export interface Look {
  vibeId: string;
  outfitId: string;
  variant: number;
  effects: MakeupEffect[];
  recipe: RecipeLine[];
  headline: string;
}
