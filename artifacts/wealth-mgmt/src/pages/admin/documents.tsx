import { Layout } from "@/components/layout";
import { DocumentsView } from "@/components/documents-view";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";

import { usePageBackground } from "@/hooks/usePageBackground";

const DOCS_SLIDES = [
  {
    title: "Your Secure Document Vault",
    description: "Every critical family document — wills, property papers, investment certificates — stored with AES-256 encryption and advisor-controlled access.",
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Password-Protected Files",
    description: "Upload and view encrypted PDFs with built-in password handling. Your most sensitive documents remain safe, even in transit.",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Download Originals Anytime",
    description: "Retrieve the original source file for any uploaded document with a single click — no re-uploading, no reformatting.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

export default function AdminDocumentsPage() {
  usePageBackground('semi');
  
  return (
    <Layout>
      <div className="space-y-6">
        <ScrollingFeatureShowcase
          slides={DOCS_SLIDES}
          height="420px"
          ctaText="Upload Document"
        />
        <DocumentsView isAdmin={true} />
      </div>
    </Layout>
  );
}
