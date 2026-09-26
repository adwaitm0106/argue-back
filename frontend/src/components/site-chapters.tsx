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

const installSteps = [
  { title: "Clone the repo", body: "git clone https://github.com/adwaitm0106/argue-back.git", code: true },
  { title: "Open chrome://extensions", body: "Switch on Developer mode, top right." },
  { title: "Load unpacked", body: "Pick the argue-back folder you just cloned." },
  { title: "Add a key", body: "Click the toolbar icon, pick a provider (Groq or Gemini), paste its free key." },
  { title: "Ask anything", body: "Open chatgpt.com (or Claude, Gemini, Perplexity, any of them), ask a question, and click Argue Back under the answer." },
  { title: "Or use it anywhere", body: "Select text on any page, right click, and pick Argue Back — no chat window needed." },
];

export function InstallChapter({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section id="install" className="chapter-install relative isolate overflow-hidden border-t border-light-line text-paper">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-8 md:grid-cols-[.85fr_1.15fr] md:gap-20">
          <div>
            <p className="font-sans text-sm text-lime">Try it yourself</p>
            <Heading className="mt-5 font-display text-6xl leading-[.95] sm:text-8xl">Install it <em className="text-lime">(2 min).</em></Heading>
          </div>
          <p className="max-w-xl self-end font-display text-2xl leading-snug sm:text-4xl">Runs on any AI chat, on your own free API key. No account, no server, nothing to pay for.</p>
        </div>
        <ol className="mt-16 grid gap-0 border-t border-light-line">
          {installSteps.map((step, index) => (
            <li key={step.title} className="grid gap-3 border-b border-light-line py-7 sm:grid-cols-[3rem_1fr] sm:gap-8">
              <span className="font-display text-3xl text-lime/75" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="font-display text-2xl sm:text-3xl">{step.title}</h3>
                {step.code ? (
                  <code className="mt-3 block max-w-xl overflow-x-auto border border-light-line bg-black/30 px-4 py-3 font-mono text-sm text-lime">{step.body}</code>
                ) : (
                  <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-paper/70">{step.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 font-sans text-sm text-paper/60">Full README, provider comparison and source: <a href="https://github.com/adwaitm0106/argue-back" target="_blank" rel="noreferrer" className="underline decoration-lime underline-offset-4 hover:text-lime">github.com/adwaitm0106/argue-back</a></p>
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
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><h3 className="font-display text-5xl">The team</h3></div>
          <div className="mt-9 grid border-t border-light-line sm:grid-cols-2">
            {[{ name: "[Owais Husain]", role: "Frontend & Design" }, { name: "[Adwait]", role: "AI / Backend" }].map((person) => (
              <article key={person.name} className="border-b border-light-line py-7 sm:pr-8 sm:even:border-l sm:even:pl-8">
                <h4 className="font-display text-4xl">{person.name}</h4>
                <p className="mt-2 font-sans text-sm text-paper/65">[Role] · {person.role}</p>
              </article>
            ))}
          </div>
        </div>
        {standalone && <Link to="/" className="mt-14 inline-block border-b border-lime pb-1 font-sans text-lime">Explore Argue Back</Link>}
      </div>
    </section>
  );
}