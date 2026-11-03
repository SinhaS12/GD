import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve(import.meta.dir, "dist");
const apiUrl = process.env.API_URL?.trim().replace(/\/+$/, "") ?? "";

if (process.env.VERCEL && !apiUrl) {
  throw new Error("Set API_URL to the deployed backend URL in the Vercel project.");
}

await mkdir(outputDirectory, { recursive: true });
for (const filename of ["index.html", "styles.css", "app.js", "favicon.svg"]) {
  await cp(resolve(import.meta.dir, filename), resolve(outputDirectory, filename));
}
await Bun.write(
  resolve(outputDirectory, "config.js"),
  `window.GD_API_URL = ${JSON.stringify(apiUrl)};\n`,
);
