"use client";

import { useMemo, useRef, useState } from "react";
import outfitsData from "@/data/outfits.json";
import { Swatches } from "@/components/Swatches";
import { VibePicker } from "@/components/VibePicker";
import { blendFace, boxFromTap, cropFace, findFace, loadImage, preparePhoto, type Box } from "@/lib/face";
import { SAMPLE_MODEL } from "@/lib/sample";
import { buildLook, rackFor } from "@/lib/stylist";
import type { Look, Outfit } from "@/lib/types";
import type { Vibe } from "@/lib/vibes";

const OUTFITS = outfitsData as Outfit[];

type Step = "photo" | "vibe" | "rack" | "styling" | "result";
type Photo = { blob?: Blob; url: string; sample: boolean };
type Style = "all" | Outfit["style"];

const STAGES = ["Tailoring the outfit", "Finding your face", "Doing your makeup", "Final touches"];

export default function Home() {
  const [step, setStep] = useState<Step>("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [style, setStyle] = useState<Style>("all");
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [needTap, setNeedTap] = useState(false);
  const [result, setResult] = useState<{ outfitOnly: string; full: string | null } | null>(null);
  const [view, setView] = useState<"before" | "outfit" | "full">("full");

  // Outfit try-ons are the slow, pricey step, so remember them per outfit.
  const outfitCache = useRef(new Map<string, { image: string; face: Box | null }>());

  const rack = useMemo(() => (vibe ? rackFor(OUTFITS, vibe, style, 12) : []), [vibe, style]);
  const preview = vibe && outfit ? buildLook(vibe, outfit, 0) : null;

  function reset(to: Step) {
    setError("");
    setNeedTap(false);
    setStep(to);
  }

  async function onFile(file: File) {
    setError("");
    try {
      const p = await preparePhoto(file);
      outfitCache.current.clear();
      setPhoto({ blob: p.blob, url: p.url, sample: false });
      setStep("vibe");
    } catch {
      setError("Couldn't read that photo. Try a JPG or PNG.");
    }
  }

  async function tryOn(o: Outfit, variant: number) {
    if (!photo || !vibe) return;
    const nextLook = buildLook(vibe, o, variant);
    setOutfit(o);
    setLook(nextLook);
    setError("");
    setNeedTap(false);
    setStep("styling");
    try {
      // 1. Outfit (YouCam AI Clothes, template try-on)
      setStage(0);
      let cached = outfitCache.current.get(o.id);
      if (!cached) {
        const form = new FormData();
        form.append("templateId", o.id);
        if (photo.sample) form.append("sample", "1");
        else form.append("photo", photo.blob!, "me.jpg");
        const res = await fetch("/api/outfit", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Outfit try-on failed");
        cached = { image: data.image as string, face: null };
        outfitCache.current.set(o.id, cached);
      }
      setResult({ outfitOnly: cached.image, full: null });

      // 2. Face (in the browser)
      setStage(1);
      const img = await loadImage(cached.image);
      cached.face ??= await findFace(img);
      if (!cached.face) {
        setNeedTap(true);
        setView("outfit");
        setStep("result");
        return;
      }
      await applyMakeup(img, cached.face, nextLook);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep(result ? "result" : "rack");
    }
  }

  async function applyMakeup(img: HTMLImageElement, face: Box, l: Look) {
    // 3. Makeup (YouCam Makeup VTO) on an enlarged face crop, then blend it back in.
    setStage(2);
    const { blob, rect } = await cropFace(img, face);
    const form = new FormData();
    form.append("face", blob, "face.jpg");
    form.append("effects", JSON.stringify(l.effects));
    const res = await fetch("/api/makeup", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Makeup try-on failed");
    setStage(3);
    const madeUp = await loadImage(data.image);
    const full = await blendFace(img, madeUp, rect, face);
    setResult({ outfitOnly: img.src, full });
    setView("full");
    setStep("result");
  }

  async function onTap(e: React.MouseEvent<HTMLImageElement>) {
    if (!needTap || !outfit || !look) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const img = await loadImage(el.src);
    const face = boxFromTap(img, ((e.clientX - r.left) / r.width) * img.naturalWidth, ((e.clientY - r.top) / r.height) * img.naturalHeight);
    const cached = outfitCache.current.get(outfit.id);
    if (cached) cached.face = face;
    setNeedTap(false);
    setStep("styling");
    try {
      await applyMakeup(img, face, look);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Makeup try-on failed");
      setStep("result");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <button onClick={() => reset(photo ? "vibe" : "photo")} className="font-display text-2xl font-extrabold tracking-tight">
          Dress the <span className="sticker">Vibe</span>
        </button>
        <nav className="hidden gap-2 text-sm font-semibold sm:flex">
          {(["photo", "vibe", "rack", "result"] as Step[]).map((s, i) => (
            <span key={s} className={`rounded-full px-3 py-1 ${step === s || (s === "result" && step === "styling") ? "bg-ink text-white" : "text-muted"}`}>
              {i + 1}. {{ photo: "You", vibe: "Vibe", rack: "Outfit", result: "Look" }[s as "photo"]}
            </span>
          ))}
        </nav>
      </header>

      {error && (
        <p className="pop-in mb-5 rounded-2xl border-2 border-ink bg-pink/10 px-4 py-3 text-sm font-medium">😬 {error}</p>
      )}

      {step === "photo" && (
        <section className="grid items-center gap-10 py-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] sm:text-7xl">
              Tell us the vibe.<br />
              <span className="text-pink">We&apos;ll dress you</span> for it.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-2">
              Pick your plans. We choose an outfit that fits, match the makeup to the outfit&apos;s colors, and put the
              <b> whole look on you</b>, clothes and face together, with YouCam AI.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <label className="btn btn-pink cursor-pointer text-lg">
                📸 Upload a full-body photo
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
              <button
                className="btn btn-white text-lg"
                onClick={() => {
                  outfitCache.current.clear();
                  setPhoto({ url: SAMPLE_MODEL, sample: true });
                  setStep("vibe");
                }}
              >
                Use a sample model
              </button>
            </div>
            <p className="mt-4 text-sm text-muted">Best results: standing, facing the camera, whole body in frame, plain background.</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="panel rotate-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SAMPLE_MODEL} alt="Sample model" className="aspect-square w-full object-cover" />
            </div>
            <span className="sticker absolute -left-4 top-6 text-lg">outfit ✓</span>
            <span className="sticker absolute -right-3 bottom-10 rotate-6 bg-pink text-lg text-white">makeup ✓</span>
          </div>
        </section>
      )}

      {step === "vibe" && (
        <section className="pop-in space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-extrabold">What&apos;s the vibe?</h2>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="Your photo" className="h-16 w-16 rounded-2xl border-2 border-ink object-cover" />
            )}
          </div>
          <VibePicker
            onPick={(v) => {
              setVibe(v);
              setOutfit(null);
              setStep("rack");
            }}
          />
        </section>
      )}

      {step === "rack" && vibe && (
        <section className="pop-in space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-pink">{vibe.emoji} {vibe.name}</p>
              <h2 className="font-display text-4xl font-extrabold">Pick your outfit</h2>
              <p className="text-ink-2">Picked from YouCam&apos;s outfit catalog for this vibe. Your makeup will be matched to it.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "feminine", "masculine"] as Style[]).map((s) => (
                <button key={s} className="chip capitalize" aria-pressed={style === s} onClick={() => setStyle(s)}>{s}</button>
              ))}
              <button className="chip" onClick={() => reset("vibe")}>↺ Change vibe</button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {rack.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOutfit(o)}
                  className={`overflow-hidden rounded-2xl border-2 bg-white text-left transition ${outfit?.id === o.id ? "border-pink shadow-[4px_4px_0_var(--pink)]" : "border-ink hover:-translate-y-0.5"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.thumb} alt={o.title} loading="lazy" className="aspect-[352/324] w-full bg-cream object-cover" />
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="truncate text-xs font-bold">{o.title}</span>
                    <Swatches hexes={o.colors.slice(0, 3).map((c) => c.hex)} size={12} />
                  </div>
                </button>
              ))}
            </div>

            <aside className="panel h-fit space-y-4 p-5 lg:sticky lg:top-4">
              {outfit && preview ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">The look recipe</p>
                  <p className="font-display text-2xl font-extrabold leading-tight">{preview.headline}</p>
                  <ul className="space-y-3">
                    {preview.recipe.map((r) => (
                      <li key={r.part} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Swatches hexes={r.hexes} />
                          <b>{r.part}:</b> {r.shade} <span className="text-muted">· {r.finish}</span>
                        </div>
                        <p className="mt-0.5 text-ink-2">{r.why}</p>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => tryOn(outfit, 0)} className="btn btn-pink w-full text-lg">✨ Put it on me</button>
                </>
              ) : (
                <>
                  <p className="font-display text-xl font-extrabold">Pick an outfit to see its makeup recipe.</p>
                  <p className="text-sm text-ink-2">Or let us choose.</p>
                  <button onClick={() => setOutfit(rack[Math.floor(Math.random() * Math.min(4, rack.length))])} className="btn btn-lime w-full">🎲 Surprise me</button>
                </>
              )}
            </aside>
          </div>
        </section>
      )}

      {step === "styling" && (
        <section className="pop-in mx-auto max-w-md py-10 text-center">
          <p className="wobble inline-block text-7xl">{stage === 0 ? "🧵" : stage === 1 ? "🔍" : stage === 2 ? "💄" : "✨"}</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold">{STAGES[stage]}…</h2>
          <ol className="panel mt-6 space-y-2 p-5 text-left">
            {STAGES.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 ${i > stage ? "text-muted" : ""}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full border-2 border-ink text-xs font-bold ${i < stage ? "bg-lime" : i === stage ? "bg-pink text-white" : "bg-white"}`}>
                  {i < stage ? "✓" : i + 1}
                </span>
                {s}
                {i === 0 && <span className="ml-auto text-xs text-muted">YouCam AI Clothes</span>}
                {i === 2 && <span className="ml-auto text-xs text-muted">YouCam Makeup VTO</span>}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">Usually 15-25 seconds.</p>
        </section>
      )}

      {step === "result" && result && outfit && look && vibe && (
        <section className="pop-in grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="panel relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={view === "before" ? photo!.url : view === "outfit" || !result.full ? result.outfitOnly : result.full}
              alt="Your look"
              onClick={onTap}
              className={`w-full bg-cream object-contain ${needTap ? "cursor-crosshair" : ""}`}
            />
            {needTap && (
              <p className="absolute inset-x-4 top-4 rounded-2xl border-2 border-ink bg-white p-3 text-center text-sm font-semibold">
                👆 We couldn&apos;t spot your face automatically. Tap on your face to do the makeup.
              </p>
            )}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border-2 border-ink bg-white p-1">
              {(["before", "outfit", "full"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  disabled={v === "full" && !result.full}
                  className={`rounded-full px-3 py-1 text-sm font-bold disabled:opacity-40 ${view === v ? "bg-ink text-white" : ""}`}
                >
                  {{ before: "Before", outfit: "Outfit", full: "Full look" }[v]}
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="panel space-y-3 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-pink">{vibe.emoji} {vibe.name}</p>
              <p className="font-display text-3xl font-extrabold leading-tight">{look.headline}</p>
              <div className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outfit.thumb} alt="" className="h-14 w-14 rounded-xl border-2 border-ink object-cover" />
                <div className="text-sm">
                  <p className="font-bold">{outfit.title}</p>
                  <p className="text-muted">{outfit.category} · YouCam outfit</p>
                </div>
              </div>
              <ul className="space-y-3">
                {look.recipe.map((r) => (
                  <li key={r.part} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Swatches hexes={r.hexes} />
                      <b>{r.part}:</b> {r.shade} <span className="text-muted">· {r.finish}</span>
                    </div>
                    <p className="mt-0.5 text-ink-2">{r.why}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => tryOn(outfit, look.variant + 1)} disabled={needTap} className="btn btn-pink col-span-2">
                💄 Remix the makeup
              </button>
              <button onClick={() => reset("rack")} className="btn btn-white">👗 New outfit</button>
              <button onClick={() => reset("vibe")} className="btn btn-lime">🎰 New vibe</button>
            </div>
            <p className="text-xs text-muted">Remixing keeps the outfit and only redoes the makeup, so it&apos;s quick.</p>
          </aside>
        </section>
      )}
    </div>
  );
}
