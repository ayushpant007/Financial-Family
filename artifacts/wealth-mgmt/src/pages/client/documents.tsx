import { Layout } from "@/components/layout";
import { DocumentsView } from "@/components/documents-view";

export default function ClientDocumentsPage() {
  return (
    <Layout>
      <DocumentsView isAdmin={false} />
    </Layout>
  );
}
