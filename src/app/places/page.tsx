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
  let places;
  try {
    places = await getPlaces();
  } catch {
    return (
      <div style={{ padding: "2rem 1.5rem" }}>
        <p className="bx-text-sm" style={{ opacity: 0.6 }}>
          Unable to load destinations. Please try again later.
        </p>
      </div>
    );
  }
  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PlacesExplorer places={places} />
    </div>
  );
}
