import { Reader } from "../src/components/reader";
import { readGeneratedEntries } from "../src/lib/generated-entries";

export const dynamic = "force-static";

export default async function HomePage() {
  const entries = await readGeneratedEntries();
  return <Reader entries={entries} />;
}
