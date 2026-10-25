import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Ski Handbook",
    short_name: "SkiHandbook",
    description: "Training, equipment & destinations for skiers of every level.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2b44ff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
