import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { HowChapter, AboutChapter } from "@/components/site-chapters";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [
    { title: "How It Works — Argue Back" },
    { name: "description", content: "How Argue Back injects a challenge button, sends a structured challenge to the model, and renders a restructured answer in the same chat." },
    { property: "og:title", content: "How It Works — Argue Back" },
    { property: "og:description", content: "From button injection to a restructured answer: the mechanism behind Argue Back." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HowItWorks,
});

function HowItWorks() {
  return <div className="min-h-screen bg-night [--foreground:var(--paper)]"><SiteHeader overlay /><main><HowChapter standalone /><AboutChapter standalone /></main><SiteFooter /></div>;
}
