import { DocumentWorkspace } from "@/components/workspace/DocumentWorkspace";

export default function DocumentPage({ params }: { params: { id: string } }) {
  return <DocumentWorkspace documentId={params.id} />;
}
