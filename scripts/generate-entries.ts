import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildEntries } from "../src/lib/feed-builder";
import { feeds } from "../src/lib/feeds";

const entries = await buildEntries(feeds);
const generatedAt = new Date().toISOString();
const outputDirectory = resolve(process.cwd(), ".generated");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  resolve(outputDirectory, "entries.json"),
  `${JSON.stringify({ generatedAt, entries }, null, 2)}\n`,
  "utf8",
);
console.log(`Generated ${entries.length} feed entr${entries.length === 1 ? "y" : "ies"}.`);
