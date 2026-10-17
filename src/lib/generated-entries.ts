import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NormalizedEntry } from "./types";

export async function readGeneratedEntries(): Promise<NormalizedEntry[]> {
  const generatedPath = join(process.cwd(), ".generated", "entries.json");
  try {
    return JSON.parse(await readFile(generatedPath, "utf8")) as NormalizedEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
