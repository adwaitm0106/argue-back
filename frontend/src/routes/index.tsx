import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeSelect } from "@/components/ui/mode-select";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AboutChapter, HowChapter, InstallChapter } from "@/components/site-chapters";
import { SilkBackdrop } from "@/components/silk-backdrop";
import MorphGallery from "@/components/ui/morph-gallery";
import { MODES } from "@/lib/modes";
import reel1 from "@/assets/argue-reel-1.jpg";
import reel2 from "@/assets/argue-reel-2.jpg";
import reel3 from "@/assets/argue-reel-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Argue Back — Challenge the first answer" },
    { name: "description", content: "A button to interrogate AI answers. Try The Decay and watch an answer shed its filler until only the claim remains." },
    { property: "og:title", content: "Argue Back — Challenge the first answer" },
    { property: "og:description", content: "Interrogate the AI's answer instead of accepting it. Try The Decay live." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const QUESTION = "Should I take an umbrella today?";
const SENTENCES = [
  "That's a good question, and there are a few things you might want to consider before heading out.",
  "Weather can change quickly, so it is often helpful to think about your plans for the day.",
  "If rain is forecast, take an umbrella.",
  "Of course, everyone's preferences are different, and some people don't mind getting a little wet.",
  "If the forecast is clear, leave it at home.",
  "Ultimately, the best choice depends on what feels right for you and your situation.",
];
const CORE = [2, 4];
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const FULL_WORDS = countWords(SENTENCES.join(" "));
const REEL = [
  { src: reel1, alt: "Magnifying glass on a paper answer" },
  { src: reel2, alt: "Lime paper question mark on a dark green desk" },
  { src: reel3, alt: "A bright strip pulled from dark answer sheets" },
];

function Index() {
  const [removed, setRemoved] = useState<number[]>([]);
  const [fading, setFading] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const [rebuildVersion, setRebuildVersion] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const runDecay = () => {
    if (running) return;
    timers.current.forEach(clearTimeout);
    setRemoved([]);
    setFading(null);
    setRunning(true);
    setMode("The Decay");
    const order = SENTENCES.map((_, i) => i).filter((i) => !CORE.includes(i));
    order.forEach((idx, n) => {
      timers.current.push(setTimeout(() => setFading(idx), 220 + n * 960));
      timers.current.push(setTimeout(() => {
        setFading(null);
        setRemoved((prev) => [...prev, idx]);
        if (n === order.length - 1) setRunning(false);
      }, 220 + n * 960 + 840));
    });
  };
  const reset = () => {
    timers.current.forEach(clearTimeout);
    setRunning(false);
    setFading(null);
    setRemoved([]);
    setMode(null);
  };
  const selectMode = (name: string) => {
    if (name === "The Decay") { runDecay(); return; }
    timers.current.forEach(clearTimeout);
    setRunning(false);
    setFading(null);
    setRemoved([]);
    setMode(name);
    if (name === "The Rebuild") setRebuildVersion((value) => value + 1);
  };
  const words = countWords(SENTENCES.filter((_, i) => !removed.includes(i)).join(" "));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <section className="relative isolate bg-night text-paper [--foreground:var(--paper)]">
          {/* Decorative background only — clipped to the section on its own, rather
              than via overflow-hidden on the whole section, which used to also clip
              the "Argue back" dropdown below whenever it grew past the section's
              height. (ModeSelect now renders its popover through a portal anyway, so
              it's no longer section-bound at all — kept scoped here regardless, since
              a section-wide overflow-hidden is exactly the kind of thing that quietly
              breaks the next thing someone adds inside it.) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <SilkBackdrop />
            <div className="absolute inset-0 opacity-65">
              <MorphGallery items={REEL} height="100%" className="h-full" autoplay={4100} duration={1900} loop arrows={false} thumbnails={false} />
            </div>
            <div className="reel-mask absolute inset-0" />
          </div>
          <SiteHeader overlay />
          <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-16 text-center sm:px-8 sm:pt-20">
            <h1 className="font-display text-[clamp(5rem,12vw,10rem)] leading-[.83] text-paper">Argue <em className="font-normal text-lime">Back.</em></h1>
            <p className="mt-7 max-w-2xl font-display text-2xl leading-tight sm:text-3xl">The AI's first answer is <em className="text-lime">an</em> answer. Not the answer.</p>
             <p className="mt-4 max-w-lg font-sans text-sm leading-relaxed text-paper/80 sm:text-base">One button beside an AI response. Four ways to question what it says, what it hides, and what it only guesses.</p>

            <div className="mt-12 w-full max-w-3xl border border-light-line bg-night/90 text-left backdrop-blur-md sm:mt-14">
              <div className="border-b border-light-line px-5 py-5 sm:px-8">
                <p className="font-sans text-xs text-lime">You asked</p>
                <h2 className="mt-2 font-display text-xl leading-snug text-paper sm:text-2xl">{QUESTION}</h2>
              </div>
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                 <div className="min-h-[12rem] font-display text-xl leading-[1.4] text-paper sm:min-h-[10rem] sm:text-2xl" aria-live="polite">
                   {mode === "The Graveyard" ? <div className="space-y-4"><p className="text-lime">Other answers considered</p><p className="border-l border-light-line pl-4 text-paper/65">“Always take one, just in case.”</p><p className="border-l border-light-line pl-4 text-paper/65">“No, you probably won't need it.”</p><p className="border-l border-lime pl-4">A better answer depends on the forecast, not a blanket rule.</p></div> : mode === "The Rebuild" ? <p>{rebuildVersion % 2 ? "Check the forecast before you go: rain means bring an umbrella; clear skies mean you can leave it behind." : "An umbrella is useful if rain is expected. Otherwise, you can skip it."}</p> : mode === "The Guess, Highlighted" ? <p>Without a location or forecast, <mark className="bg-lime text-night">assuming it will rain is a guess</mark>. Check today's forecast first; bring an umbrella if rain is likely.</p> : <div className="space-y-1">{SENTENCES.map((sentence, i) => !removed.includes(i) && <div key={i} className={`decay-sentence ${fading === i ? "decay-sentence-exit" : ""}`}><span>{sentence}</span></div>)}</div>}
                 </div>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-light-line pt-5">
                  <ModeSelect
                    aria-label="Ways to argue back"
                    placeholder="Argue back"
                    value={mode}
                    onSelect={selectMode}
                    options={MODES.map((item) => ({ value: item.name, title: item.name, description: item.blurb }))}
                  />
                   {(!mode || mode === "The Decay") && <p className="font-sans text-sm tabular-nums text-paper/75" aria-live="polite">{FULL_WORDS} words {words !== FULL_WORDS && <span className="text-lime">→ {words} words</span>}</p>}
                  {removed.length > 0 && !running && <Button type="button" variant="ghost" onClick={reset} className="h-9 rounded-none px-2 text-paper underline underline-offset-4 hover:bg-forest hover:text-paper"><RotateCcw aria-hidden="true" /> Restore the filler</Button>}
                </div>
              </div>
            </div>
          </div>
        </section>

         <section className="border-b border-hairline bg-background py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 md:grid-cols-[.7fr_1.3fr] md:gap-20">
            <p className="font-sans text-sm text-muted-foreground">The problem</p>
            <div><h2 className="max-w-3xl font-display text-4xl leading-[1.02] sm:text-6xl">You can’t currently disagree with an AI. You can only ask again.</h2>
            <p className="mt-8 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">Every chat interface is built around agreement: you ask, it answers, you accept. Contesting the reasoning means retyping the question and hoping. Argue Back makes that challenge a control in the interface.</p></div>
          </div>
        </section>
         <section id="the-modes" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="flex flex-col justify-between gap-5 border-b border-hairline pb-8 sm:flex-row sm:items-end"><p className="font-sans text-sm text-muted-foreground">Four ways to question an answer</p><h2 className="font-display text-4xl sm:text-6xl">The modes</h2></div>
             <div>{MODES.map((mode) => <div key={mode.name} className="grid gap-3 border-b border-hairline py-7 md:grid-cols-[1fr_1fr] md:gap-12">
               <div className="flex items-baseline gap-4"><h3 className="font-display text-3xl sm:text-4xl">{mode.name}</h3></div>
              <p className="max-w-md font-sans text-sm leading-relaxed sm:text-base">{mode.blurb}</p>
            </div>)}</div>
          </div>
        </section>
         <HowChapter />
         <InstallChapter />
         <AboutChapter />
      </main>
      <SiteFooter />
    </div>
  );
}
