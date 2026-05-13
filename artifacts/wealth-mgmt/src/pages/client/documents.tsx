import { Layout } from "@/components/layout";
import { DocumentsView } from "@/components/documents-view";
import { ScrollingFeatureShowcase } from "@/components/ui/interactive-scrolling-story-component";

import { usePageBackground } from "@/hooks/usePageBackground";

const CLIENT_DOCS_SLIDES = [
  {
    title: "All Your Papers, One Place",
    description: "Access property deeds, insurance policies, tax returns, and investment certificates — organised, encrypted, and available whenever you need them.",
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Encrypted & Advisor-Curated",
    description: "Every file is reviewed and tagged by your advisor before it reaches your vault. No unvetted documents, no clutter.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
  {
    title: "Download in One Click",
    description: "Need the original certificate for a bank visit? Download any document instantly — originals preserved, always accessible.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2070&auto=format&fit=crop",
    bgColor: "#FFFFFF", textColor: "#0F172A",
  },
];

export default function ClientDocumentsPage() {
  usePageBackground('light');
  
  return (
    <Layout>
      <div className="space-y-6">
        <ScrollingFeatureShowcase
          slides={CLIENT_DOCS_SLIDES}
          height="420px"
          ctaText="View Documents"
        />
        <DocumentsView isAdmin={false} />
      </div>
    </Layout>
  );
}
