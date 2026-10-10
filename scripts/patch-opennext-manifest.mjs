import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js", import.meta.url);
let source = await readFile(target, "utf8");

const oldGlob = "**/{*-manifest,required-server-files,prefetch-hints}.json";
const newGlob = "**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json";
if (source.includes(oldGlob) && !source.includes(newGlob)) {
  source = source.replace(oldGlob, newGlob);
  await writeFile(target, source, "utf8");
}

if (!source.includes(newGlob)) {
  throw new Error("OpenNext load-manifest patch target changed; preview-props.json is not covered");
}
