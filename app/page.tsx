import { Suspense } from "react";
import { connection } from "next/server";
import MapApp from "@/components/MapApp";
import { ensureDb } from "@/lib/db/ensure";
import { listPublicToilets } from "@/lib/db/toilets";

export default function Home() {
  return (
    <Suspense fallback={<MapApp initialToilets={[]} />}>
      <HomeMap />
    </Suspense>
  );
}

async function HomeMap() {
  await connection();
  await ensureDb();
  const toilets = await listPublicToilets();
  return <MapApp initialToilets={toilets} />;
}
