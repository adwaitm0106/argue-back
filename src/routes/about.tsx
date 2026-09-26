import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AboutChapter } from "@/components/site-chapters";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — Argue Back" },
    { name: "description", content: "Why Argue Back was built: contestability should be a real part of the AI chat interface, not only a research concept." },
    { property: "og:title", content: "About — Argue Back" },
    { property: "og:description", content: "Meet the thinking behind Argue Back and its BitNBuild '26 team." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: About,
});
function About() {
  return <div className="min-h-screen bg-deep-blue [--foreground:var(--paper)]"><SiteHeader overlay /><main><AboutChapter standalone /></main><SiteFooter /></div>;
}
