"use client";

import type { FaceDetector } from "@mediapipe/tasks-vision";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

let detectorPromise: Promise<FaceDetector> | null = null;

function detector() {
  detectorPromise ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
    return FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/blaze_face_short_range.tflite" },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.45,
    });
  })();
  return detectorPromise;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load image"));
    img.src = src;
  });
}

/**
 * Finds the face in a (usually full-body) photo. The detector is built for close-up faces,
 * so we scan the upper part of the image in overlapping tiles at a few zoom levels.
 */
export async function findFace(img: HTMLImageElement): Promise<Box | null> {
  const det = await detector();
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 384;
  const ctx = tile.getContext("2d")!;
  let best = null as { box: Box; score: number } | null;

  for (const frac of [1, 0.55, 0.35, 0.22]) {
    const size = Math.round(Math.min(W, H) * frac);
    const step = Math.max(1, Math.round(size / 2));
    const maxY = frac === 1 ? 0 : Math.max(0, Math.round(H * 0.65) - size);
    for (let y = 0; y <= Math.max(0, Math.min(maxY, H - size)); y += step) {
      for (let x = 0; x <= Math.max(0, W - size); x += step) {
        ctx.clearRect(0, 0, 384, 384);
        ctx.drawImage(img, x, y, size, size, 0, 0, 384, 384);
        for (const d of det.detect(tile).detections) {
          const score = d.categories[0]?.score ?? 0;
          const b = d.boundingBox;
          if (!b || (best && score <= best.score)) continue;
          const k = size / 384;
          best = { score, box: { x: x + b.originX * k, y: y + b.originY * k, w: b.width * k, h: b.height * k } };
        }
      }
    }
    if (best && best.score > 0.75) break;
  }
  return best?.box ?? null;
}

/** A guess at the face box from one tap (for when detection fails). */
export function boxFromTap(img: HTMLImageElement, px: number, py: number): Box {
  const w = Math.max(48, img.naturalWidth * 0.08);
  return { x: px - w / 2, y: py - w * 0.6, w, h: w * 1.2 };
}

/** Square crop around the face (with hair and neck), enlarged so YouCam Makeup can see it clearly. */
export async function cropFace(img: HTMLImageElement, face: Box) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const side = Math.round(Math.min(Math.max(face.w * 3.2, 200), W, H));
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h * 0.5;
  const rect = {
    x: Math.round(Math.min(Math.max(0, cx - side / 2), W - side)),
    y: Math.round(Math.min(Math.max(0, cy - side / 2), H - side)),
    w: side,
    h: side,
  };
  const out = Math.max(side, 1024);
  const c = document.createElement("canvas");
  c.width = c.height = out;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x, rect.y, side, side, 0, 0, out, out);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("crop failed"))), "image/jpeg", 0.93));
  return { blob, rect };
}

/** Paints the made-up face back onto the outfit photo with a soft oval edge so there's no visible seam. */
export async function blendFace(base: HTMLImageElement, madeUp: HTMLImageElement, rect: Box, face: Box) {
  const c = document.createElement("canvas");
  c.width = base.naturalWidth;
  c.height = base.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(base, 0, 0);

  const patch = document.createElement("canvas");
  patch.width = rect.w;
  patch.height = rect.h;
  const p = patch.getContext("2d")!;
  p.drawImage(madeUp, 0, 0, rect.w, rect.h);
  // Oval mask centred on the face, fading out well before the crop edge.
  const fx = face.x + face.w / 2 - rect.x;
  const fy = face.y + face.h / 2 - rect.y;
  const rx = face.w * 1.1;
  const ry = face.h * 1.15;
  p.globalCompositeOperation = "destination-in";
  p.save();
  p.translate(fx, fy);
  p.scale(1, ry / rx);
  const g = p.createRadialGradient(0, 0, rx * 0.6, 0, 0, rx);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  p.fillStyle = g;
  p.fillRect(-rect.w, -rect.h, rect.w * 3, rect.h * 3);
  p.restore();

  ctx.drawImage(patch, rect.x, rect.y);
  return c.toDataURL("image/jpeg", 0.92);
}

/** Resize a user photo for upload (YouCam limit is 10MB; 1600px is plenty for try-on). */
export async function preparePhoto(file: Blob) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't read photo"))), "image/jpeg", 0.92));
  return { blob, url: c.toDataURL("image/jpeg", 0.85) };
}
