import { Link } from "@tanstack/react-router";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`relative z-20 border-b ${overlay ? "border-light-line" : "border-hairline"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link to="/" className="font-display text-2xl leading-none text-foreground" aria-label="Argue Back home">Argue Back<span className="text-primary">.</span></Link>
        <nav aria-label="Main navigation" className="flex gap-5 font-sans text-sm sm:gap-8">
          <Link to="/" hash="how-it-works" className="text-foreground/75 hover:underline hover:underline-offset-4">How it works</Link>
          <Link to="/" hash="about" className="text-foreground/75 hover:underline hover:underline-offset-4">About</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-background">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <p className="font-sans text-sm text-muted-foreground">Built for BitNBuild '26 — UAE Regional Qualifying Round.</p>
        <nav aria-label="Footer navigation" className="flex gap-6 font-sans text-sm">
          <Link to="/" hash="how-it-works" className="underline decoration-hairline underline-offset-4 hover:text-primary">How it works</Link>
          <Link to="/" hash="about" className="underline decoration-hairline underline-offset-4 hover:text-primary">About</Link>
        </nav>
      </div>
    </footer>
  );
}