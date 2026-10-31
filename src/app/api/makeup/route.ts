import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, refundTryOn, takeTryOn } from "@/lib/limit";
import { hasKey, tryOnMakeup, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 90;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const pct = z.number().int().min(0).max(100);
const Effects = z
  .array(
    z.object({
      category: z.enum(["lip_color", "blush", "eye_shadow", "eye_liner"]),
      pattern: z.object({ name: z.string().max(40) }).optional(),
      shape: z.object({ name: z.string().max(40) }).optional(),
      style: z.object({ type: z.string().max(20) }).optional(),
      palettes: z
        .array(
          z.object({
            color: hex,
            texture: z.enum(["matte", "satin", "gloss", "sheer"]),
            colorIntensity: pct,
            gloss: pct.optional(),
            transparencyIntensity: pct.optional(),
          }),
        )
        .min(1)
        .max(3),
    }),
  )
  .min(1)
  .max(6);

export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "Server is missing YOUCAM_API_KEY." }, { status: 503 });
  const form = await req.formData();
  const face = form.get("face");
  if (!(face instanceof File) || face.type !== "image/jpeg" || face.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Invalid face image." }, { status: 400 });
  }
  const parsed = Effects.safeParse(JSON.parse(String(form.get("effects") ?? "null")));
  if (!parsed.success) return NextResponse.json({ error: "Invalid makeup recipe." }, { status: 400 });

  const ip = clientIp(req);
  if (!takeTryOn(ip)) {
    return NextResponse.json({ error: "This demo has hit today's try-on limit. Come back tomorrow!" }, { status: 429 });
  }
  try {
    const image = await tryOnMakeup(new Uint8Array(await face.arrayBuffer()), face.type, parsed.data);
    return NextResponse.json({ image });
  } catch (err) {
    refundTryOn(ip);
    if (err instanceof YouCamError) return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    console.error(err);
    return NextResponse.json({ error: "Makeup try-on failed. Try again." }, { status: 500 });
  }
}
