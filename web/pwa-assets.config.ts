import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config"

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0.35, resizeOptions: { background: "#0F1110" } },
    apple: { sizes: [180], padding: 0.3, resizeOptions: { background: "#0F1110" } },
  },
  images: ["public/favicon.svg"],
})
