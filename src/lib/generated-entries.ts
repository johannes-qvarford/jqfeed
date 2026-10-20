import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NormalizedEntry } from "./types";

export type GeneratedSnapshot = {
  generatedAt: string;
  entries: NormalizedEntry[];
};

export async function readGeneratedSnapshot(): Promise<GeneratedSnapshot | null> {
  const generatedPath = join(process.cwd(), ".generated", "entries.json");
  try {
    return JSON.parse(await readFile(generatedPath, "utf8")) as GeneratedSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
