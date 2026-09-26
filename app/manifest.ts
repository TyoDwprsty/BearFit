import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BearFit – Diet & Workout Tracker",
    short_name: "BearFit",
    description: "Catat makan, pilih latihan harian, dan dipantau coach — bareng Beru si beruang.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF8F0",
    theme_color: "#FFF8F0",
    lang: "id",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Posting makanan", url: "/food/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Latihan hari ini", url: "/workout", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pengingat", url: "/reminders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
