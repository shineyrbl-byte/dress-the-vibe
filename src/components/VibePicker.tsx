"use client";

import { useRef, useState } from "react";
import { matchVibe, VIBES, type Vibe } from "@/lib/vibes";

export function VibePicker({ onPick }: { onPick: (v: Vibe) => void }) {
  const [text, setText] = useState("");
  const [spinning, setSpinning] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function spin() {
    const target = VIBES[Math.floor(Math.random() * VIBES.length)];
    let i = 0;
    const total = 16 + VIBES.indexOf(target);
    const tick = () => {
      setSpinning(VIBES[i % VIBES.length].id);
      i++;
      if (i <= total) timer.current = setTimeout(tick, 60 + i * 9);
      else timer.current = setTimeout(() => { setSpinning(null); onPick(target); }, 450);
    };
    tick();
  }

  return (
    <div className="space-y-6">
      <form
        className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onPick(matchVibe(text));
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Describe your plans</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you dressing for? e.g. “first date at a wine bar”"
            className="w-full rounded-full border-2 border-ink bg-cream px-5 py-3 outline-none focus:bg-white"
          />
        </label>
        <button className="btn btn-pink" disabled={!text.trim()}>Read my vibe →</button>
        <button type="button" onClick={spin} disabled={!!spinning} className="btn btn-lime">🎰 Spin</button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => onPick(v)}
            disabled={!!spinning}
            className={`panel group relative overflow-hidden p-4 text-left transition ${spinning === v.id ? "-translate-y-1 ring-4 ring-pink" : ""} ${spinning && spinning !== v.id ? "opacity-60" : ""}`}
          >
            <div className="absolute inset-x-0 top-0 h-20" style={{ background: v.gradient }} />
            <div className="relative pt-12">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-white text-3xl transition group-hover:rotate-6">{v.emoji}</span>
              <p className="mt-3 font-display text-lg font-extrabold leading-tight">{v.name}</p>
              <p className="mt-1 text-sm text-ink-2">{v.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
