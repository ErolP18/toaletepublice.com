import { NextResponse } from "next/server";
import { counties } from "@/lib/counties";

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  house_number?: string;
};

function matchCounty(value?: string, city?: string) {
  const haystack = `${value ?? ""} ${city ?? ""}`.toLocaleLowerCase("ro");
  if (haystack.includes("bucurești") || haystack.includes("bucuresti")) {
    return "București";
  }
  if (!value) return "";
  const cleaned = value.replace(/^județul\s+/i, "").replace(/^municipiul\s+/i, "").trim();
  const found = counties.find(
    (county) => county.toLocaleLowerCase("ro") === cleaned.toLocaleLowerCase("ro"),
  );
  return found ?? cleaned;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Coordonate lipsă." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ro");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "toaletepublice.com/0.1 (https://github.com/ErolP18/toaletepublice.com)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Nu am putut citi adresa de pe OpenStreetMap." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    display_name?: string;
    address?: NominatimAddress;
  };
  const address = data.address ?? {};
  const street = address.road ?? address.pedestrian ?? address.footway ?? "";
  const house = address.house_number ? ` ${address.house_number}` : "";
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    "";

  return NextResponse.json({
    address: street ? `${street}${house}` : (data.display_name ?? ""),
    city,
    county: matchCounty(address.county ?? address.state, city),
    displayName: data.display_name ?? "",
  });
}
