export const dynamic = "force-dynamic";
import { getPlaces } from "@/lib/places";
import HomePageContent from "@/components/home-page-content";

export default async function Home() {
  const places = await getPlaces();
  return <HomePageContent places={places} />;
}
