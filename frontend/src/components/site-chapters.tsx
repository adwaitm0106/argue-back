import { Link } from "@tanstack/react-router";

const steps = [
  { title: "The button appears", body: "Argue Back sits beside the answer, right where you're already reading." },
  { title: "You choose a challenge", body: "Each mode asks a different question of the same response — no new prompt to write." },
  { title: "The answer changes", body: "A more useful version appears in the conversation, with the original thought still in context." },
];

export function HowChapter({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section id="how-it-works" className="chapter-how relative isolate overflow-hidden border-t border-light-line text-paper">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-8 md:grid-cols-[.85fr_1.15fr] md:gap-20">
          <div>
            <p className="font-sans text-sm text-lime">The next question</p>
            <Heading className="mt-5 font-display text-6xl leading-[.95] sm:text-8xl">How it <em className="text-lime">works.</em></Heading>
          </div>
          <p className="max-w-xl self-end font-display text-2xl leading-snug sm:text-4xl">A challenge, not another prompt. Stay with the answer and ask more of it.</p>
        </div>
        <div className="mt-20 grid border-y border-light-line md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="border-b border-light-line py-8 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <span className="font-display text-5xl text-lime/75" aria-hidden="true">{["✳", "↗", "≋"][index]}</span>
              <h3 className="mt-7 font-display text-3xl">{step.title}</h3>
              <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-paper/70">{step.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-[.85fr_1.15fr] md:gap-20">
          <p className="font-sans text-sm text-lime">Inside The Decay</p>
          <p className="max-w-xl font-sans text-base leading-relaxed text-paper/75">The examples on Home use prepared answers to show how each mode behaves. The extension's model-powered round trip is the intended experience as these modes go live.</p>
        </div>
        {standalone && <Link to="/" hash="about" className="mt-14 inline-block border-b border-lime pb-1 font-sans text-lime">Continue to About</Link>}
      </div>
    </section>
  );
}

export function AboutChapter({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section id="about" className="chapter-about relative isolate overflow-hidden border-t border-light-line text-paper">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-10 md:grid-cols-[.85fr_1.15fr] md:gap-20">
          <div>
            <p className="font-sans text-sm text-lime">Why we built it</p>
            <Heading className="mt-5 font-display text-6xl leading-[.95] sm:text-8xl">About <em className="text-lime">us.</em></Heading>
          </div>
          <div className="self-end">
            <p className="font-display text-3xl leading-tight sm:text-5xl">The missing button is <em className="text-lime">disagree.</em></p>
            <p className="mt-8 max-w-xl font-sans text-base leading-relaxed text-paper/75">AI can give you a long, careful-sounding paragraph and treat that as the end of the exchange. If a claim feels padded or uncertain, you should be able to push back without starting over. We built Argue Back around contestability: making the ability to challenge an answer part of the interface itself.</p>
          </div>
        </div>
        <div className="mt-20 border-t border-light-line pt-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><h3 className="font-display text-5xl">The team</h3><p className="font-sans text-sm text-paper/65">BitNBuild '26 · UAE Regional Qualifying Round</p></div>
          <div className="mt-9 grid border-t border-light-line sm:grid-cols-2">
            {[{ name: "[Owais Husain]", role: "Frontend & Design" }, { name: "[Adwait]", role: "AI / Backend" }].map((person) => (
              <article key={person.name} className="border-b border-light-line py-7 sm:pr-8 sm:even:border-l sm:even:pl-8">
                <h4 className="font-display text-4xl">{person.name}</h4>
                <p className="mt-2 font-sans text-sm text-paper/65">[Role] · {person.role}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 font-sans text-sm text-paper/65">GDG CRCE × GDGoC BPDC</p>
        </div>
        {standalone && <Link to="/" className="mt-14 inline-block border-b border-lime pb-1 font-sans text-lime">Explore Argue Back</Link>}
      </div>
    </section>
  );
}