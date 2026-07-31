import PageHeader from "@/components/dashboard/PageHeader";
import ToolsClient from "@/components/dashboard/tools/ToolsClient";

export const metadata = {
  title: "Herramientas | Vector",
};

export default function ToolsPage() {
  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader eyebrow="Calculadoras de cabina y piernera" title="Herramientas" />
      <ToolsClient />
    </div>
  );
}
