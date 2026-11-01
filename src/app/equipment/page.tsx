import type { Metadata } from "next";
import EquipmentExplorer from "@/components/equipment-explorer";
import BackToPlace from "@/components/back-to-place";
import ModuleHeader from "@/components/module-header";

export const metadata: Metadata = {
  title: "Equipment",
  description: "Ski and snowboard gear guides — helmets, boots, skis, poles, goggles, and avalanche safety equipment with maintenance tips.",
  alternates: { canonical: "https://theskihandbook.com/equipment" },
  openGraph: { url: "https://theskihandbook.com/equipment" },
};

export default function EquipmentPage() {
  return (
    <div>
      <BackToPlace />
      <ModuleHeader moduleKey="equipment" />
      <EquipmentExplorer />
    </div>
  );
}
