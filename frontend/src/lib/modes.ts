// Shared between the homepage's live demo/mode grid and the site nav's "Modes"
// dropdown, so both always list the same four modes with the same copy.
export const MODES = [
  { name: "The Decay", slug: "the-decay", blurb: "Strip away the padding until only the answer remains." },
  { name: "The Graveyard", slug: "the-graveyard", blurb: "See the other answers that might have been given." },
  { name: "The Rebuild", slug: "the-rebuild", blurb: "The same point, put differently." },
  { name: "The Guess, Highlighted", slug: "the-guess-highlighted", blurb: "Spot where an answer becomes an assumption." },
] as const;
