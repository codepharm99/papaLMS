import type { Metadata } from "next";
import KausarPage from "@/components/kausar/KausarPage";

export const metadata: Metadata = {
  title: "Спросить Каусар",
  description: "Голосовой помощник Kausar AI внутри LMS.",
};

export default function Page() {
  return <KausarPage />;
}
