import type { Metadata } from "next";
import RoadmapClient from "@/components/roadmap-client";
import BackToPlace from "@/components/back-to-place";

export const metadata: Metadata = {
  title: "Training",
  description: "Ski technique drills, off-snow conditioning, and balance training for all levels — from first-timers to expert carvers.",
  alternates: { canonical: "https://theskihandbook.com/training" },
  openGraph: { url: "https://theskihandbook.com/training" },
};

export default function TrainingPage() {
  return (
    <div>
      <BackToPlace />
      <RoadmapClient />
    </div>
  );
}
