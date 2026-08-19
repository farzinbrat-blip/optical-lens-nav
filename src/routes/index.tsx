import { createFileRoute } from "@tanstack/react-router";
import { LiquidLensNav } from "@/components/LiquidLensNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liquid Lens Nav — Optical Glass Bottom Navigation" },
      {
        name: "description",
        content:
          "GPU optical lens bottom navigation: real UV refraction, magnification, chromatic dispersion and spring physics — a clean-room recreation.",
      },
      { property: "og:title", content: "Liquid Lens Nav — Optical Glass Bottom Navigation" },
      {
        property: "og:description",
        content: "Offscreen render target + lens shader: refraction, magnification, dispersion, spring-driven drag.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <h1 className="sr-only">Liquid lens optical glass bottom navigation</h1>
      <LiquidLensNav />
    </main>
  );
}
