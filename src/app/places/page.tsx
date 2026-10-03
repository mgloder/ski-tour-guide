export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { getPlaces } from "@/lib/places";
import PlacesExplorer from "@/components/places-explorer";

export const metadata: Metadata = {
  title: "Places",
  description: "Ski resort and mountain destination guides — piste breakdowns, altitude data, highlights, and best-season recommendations.",
  alternates: { canonical: "https://theskihandbook.com/places" },
  openGraph: { url: "https://theskihandbook.com/places" },
};

export default async function PlacesPage() {
  const places = await getPlaces();
  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PlacesExplorer places={places} />
    </div>
  );
}
