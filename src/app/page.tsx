import { AppHeader } from "@/components/AppHeader";
import { RecentDocuments } from "@/components/RecentDocuments";
import { TemplateCards } from "@/components/TemplateCards";
import { UploadDropzone } from "@/components/UploadDropzone";
import { WorkflowSteps } from "@/components/WorkflowSteps";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <AppHeader />
      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <RecentDocuments />
        <div className="grid gap-5">
          <UploadDropzone />
          <WorkflowSteps />
        </div>
        <TemplateCards />
      </div>
    </main>
  );
}
