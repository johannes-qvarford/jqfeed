import { Reader } from "../src/components/reader";
import { readGeneratedSnapshot } from "../src/lib/generated-entries";

export const dynamic = "force-static";

export default async function HomePage() {
  const snapshot = await readGeneratedSnapshot();
  return (
    <Reader
      entries={snapshot?.entries ?? []}
      lastUpdated={snapshot?.generatedAt ?? null}
    />
  );
}
