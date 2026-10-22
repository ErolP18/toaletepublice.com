import type { Metadata } from "next";
import { connection } from "next/server";
import PublicMap from "@/components/PublicMap";
import { getToilet } from "@/lib/db/toilets";
import { isToiletId, toiletPageUrl, toiletPath } from "@/lib/toilet-url";

export const instant = false;

type PageProps = { params: Promise<{ id: string }> };

function fallbackMeta(): Metadata {
  return {
    title: "Toalete Publice — Harta României",
    robots: { index: false, follow: true },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isToiletId(id)) return fallbackMeta();

  await connection();
  try {
    const toilet = await getToilet(id);
    if (!toilet || toilet.status === "propunere") return fallbackMeta();

    const place = toilet.address
      ? `${toilet.address}, ${toilet.city}, județul ${toilet.county}`
      : `${toilet.city}, județul ${toilet.county}`;
    const title = `${toilet.name} — ${toilet.city}`;
    const description = `Toaletă publică în ${place}. Hartă civică, gratuită.`;
    const url = toiletPageUrl(id);
    const images = toilet.photo ? [{ url: toilet.photo }] : undefined;

    return {
      title: `${title} | Toalete Publice`,
      description,
      alternates: { canonical: toiletPath(id) },
      openGraph: {
        title,
        description,
        url,
        siteName: "toaletepublice.com",
        locale: "ro_RO",
        type: "website",
        images,
      },
      twitter: {
        card: images ? "summary_large_image" : "summary",
        title,
        description,
      },
      robots: toilet.status === "confirmat" ? { index: true, follow: true } : { index: false, follow: true },
    };
  } catch {
    return fallbackMeta();
  }
}

export default async function ToiletPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicMap selectedId={id} />;
}
