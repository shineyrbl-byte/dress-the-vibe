import { NextResponse } from "next/server";
import outfits from "@/data/outfits.json";
import { clientIp, refundTryOn, takeTryOn } from "@/lib/limit";
import { SAMPLE_MODEL } from "@/lib/sample";
import { hasKey, tryOnOutfit, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

const IDS = new Set(outfits.map((o) => o.id));


export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "Server is missing YOUCAM_API_KEY." }, { status: 503 });
  const form = await req.formData();
  const photo = form.get("photo");
  const templateId = String(form.get("templateId") ?? "");
  const useSample = form.get("sample") === "1";
  if (!useSample && (!(photo instanceof File) || !["image/jpeg", "image/png"].includes(photo.type) || photo.size > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "Upload a JPG or PNG under 10MB." }, { status: 400 });
  }
  if (!IDS.has(templateId)) return NextResponse.json({ error: "Unknown outfit." }, { status: 400 });

  const ip = clientIp(req);
  if (!takeTryOn(ip)) {
    return NextResponse.json({ error: "This demo has hit today's try-on limit. Come back tomorrow!" }, { status: 429 });
  }
  try {
    const image = useSample
      ? await tryOnOutfit({ url: SAMPLE_MODEL }, "image/jpeg", templateId)
      : await tryOnOutfit(new Uint8Array(await (photo as File).arrayBuffer()), (photo as File).type, templateId);
    return NextResponse.json({ image });
  } catch (err) {
    refundTryOn(ip);
    if (err instanceof YouCamError) return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    console.error(err);
    return NextResponse.json({ error: "Outfit try-on failed. Try again." }, { status: 500 });
  }
}
