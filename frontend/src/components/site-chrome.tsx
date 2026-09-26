import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { MODES } from "@/lib/modes";

const REPO_URL = "https://github.com/adwaitm0106/argue-back";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const linkClass = overlay
    ? "text-paper/75 hover:text-paper"
    : "text-foreground/75 hover:text-foreground";

  return (
    <header className={`relative z-20 border-b ${overlay ? "border-light-line" : "border-hairline"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link to="/" className={`font-display text-2xl leading-none ${overlay ? "text-paper" : "text-foreground"}`} aria-label="Argue Back home">
          Argue Back<span className="text-primary">.</span>
        </Link>

        <NavigationMenu>
          <NavigationMenuList className="gap-1 font-sans text-sm">
            <NavigationMenuItem>
              <NavigationMenuTrigger className={`h-auto rounded-none bg-transparent px-3 py-1.5 font-sans text-sm font-normal ${linkClass} hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent`}>
                Modes
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[22rem] gap-1 border border-light-line bg-night p-2 text-paper">
                  {MODES.map((mode) => (
                    <li key={mode.slug}>
                      <NavigationMenuLink asChild>
                        <Link to="/" hash="the-modes" className="block rounded-none px-3 py-2.5 transition-colors hover:bg-forest">
                          <span className="block font-display text-base">{mode.name}</span>
                          <span className="mt-0.5 block font-sans text-xs leading-snug text-paper/70">{mode.blurb}</span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/" hash="how-it-works" className={`inline-flex h-9 items-center px-3 py-1.5 font-sans text-sm hover:underline hover:underline-offset-4 ${linkClass}`}>
                  How it works
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/" hash="about" className={`inline-flex h-9 items-center px-3 py-1.5 font-sans text-sm hover:underline hover:underline-offset-4 ${linkClass}`}>
                  About
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Argue Back on GitHub"
                  className={`inline-flex h-9 items-center gap-1.5 px-3 py-1.5 font-sans text-sm hover:underline hover:underline-offset-4 ${linkClass}`}
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub
                </a>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-background">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <p className="font-sans text-sm text-muted-foreground">Argue Back.</p>
        <nav aria-label="Footer navigation" className="flex gap-6 font-sans text-sm">
          <Link to="/" hash="how-it-works" className="underline decoration-hairline underline-offset-4 hover:text-primary">How it works</Link>
          <Link to="/" hash="about" className="underline decoration-hairline underline-offset-4 hover:text-primary">About</Link>
        </nav>
      </div>
    </footer>
  );
}