import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Connect, Plugin } from "vite";

const IMAGE_DIR = resolve(import.meta.dirname, "../../backend/images");

export function localImages(): Plugin {
	return {
		name: "local-images",
		configureServer(server) {
			const handler: Connect.NextHandleFunction = (req, res, next) => {
				const name = decodeURIComponent((req.url ?? "").split("?")[0].replace(/^\//, ""));
				if (!name) return next();

				const file = join(IMAGE_DIR, name);
				if (!file.startsWith(IMAGE_DIR)) return next();

				void stat(file)
					.then((info) => {
						if (!info.isFile()) return next();

						res.setHeader("Content-Type", "image/webp");
						res.setHeader("Content-Length", info.size);
						createReadStream(file).pipe(res);
					})
					.catch(() => next());
			};

			server.middlewares.use("/api/images", handler);
			server.middlewares.use("/images", handler);
		},
	};
}
