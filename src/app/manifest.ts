import type { MetadataRoute } from "next";
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
} from "@/constants/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "any",
    categories: ["education", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/logo.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: APP_DEFAULT_TITLE,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        url: "/",
      },
    ],
  };
}
