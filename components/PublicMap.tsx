import { connection } from "next/server";
import MapApp from "@/components/MapApp";
import { listPublicToilets } from "@/lib/db/toilets";
import { isToiletId } from "@/lib/toilet-url";

export default async function PublicMap({ selectedId = null }: { selectedId?: string | null }) {
  await connection();
  try {
    const toilets = await listPublicToilets();
    const wanted = selectedId && isToiletId(selectedId) ? selectedId : null;
    const initialSelectedId = wanted && toilets.some((toilet) => toilet.id === wanted) ? wanted : null;
    return <MapApp initialToilets={toilets} initialSelectedId={initialSelectedId} />;
  } catch {
    return <MapApp initialToilets={[]} />;
  }
}
