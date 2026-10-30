import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { firebaseServiceWorker } from "./plugins/firebase-service-worker.ts";
import { localImages } from "./plugins/local-images.ts";

export default defineConfig(({ mode }) => ({
	plugins: [tailwindcss(), reactRouter(), localImages(), firebaseServiceWorker(loadEnv(mode, import.meta.dirname))],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
