import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const TEMPLATE = resolve(import.meta.dirname, "../sw/firebase-messaging-sw.js");
const FILENAME = "firebase-messaging-sw.js";
const PLACEHOLDER = /__(VITE_[A-Z0-9_]+)__/g;

export function firebaseServiceWorker(env: Record<string, string>): Plugin {
	const render = () => {
		const template = readFileSync(TEMPLATE, "utf8");
		const missing = new Set<string>();

		const source = template.replace(PLACEHOLDER, (_, key: string) => {
			const value = env[key];
			if (!value) missing.add(key);

			return value ?? "";
		});

		if (missing.size) console.warn(`Missing env values: ${[...missing].join(", ")}`);

		return source;
	};

	return {
		name: "firebase-service-worker",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if ((req.url ?? "").split("?")[0] !== `/${FILENAME}`) return next();

				res.setHeader("Content-Type", "text/javascript");
				res.setHeader("Cache-Control", "no-store");
				res.end(render());
			});
		},
		generateBundle() {
			if (this.environment?.name !== "client") return;
			this.emitFile({ type: "asset", fileName: FILENAME, source: render() });
		},
	};
}
