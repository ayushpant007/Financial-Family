import { Layout } from "@/components/layout";
import { DocumentsView } from "@/components/documents-view";

export default function AdminDocumentsPage() {
  return (
    <Layout>
      <DocumentsView isAdmin={true} />
    </Layout>
  );
}
