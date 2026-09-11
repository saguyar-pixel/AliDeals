import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AliDeals ישראל - דילים ומדריכי קנייה",
    short_name: "AliDeals",
    description: "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e62e04",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
