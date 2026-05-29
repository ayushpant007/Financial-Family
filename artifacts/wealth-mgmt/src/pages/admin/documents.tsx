import { Layout } from "@/components/layout";
import { DocumentsView } from "@/components/documents-view";
import { FileText } from "lucide-react";
import { usePageBackground } from "@/hooks/usePageBackground";

export default function AdminDocumentsPage() {
  usePageBackground('light');
  
  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Document Vault Command Header */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-950/20 border border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-slate-800 text-amber-400 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-slate-700/50 uppercase">
                <FileText className="h-3.5 w-3.5" /> Secure Vault
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">Document Vault Workspace</h1>
              <p className="text-slate-400 text-sm max-w-xl">
                Manage, audit, and retrieve secure client financial records, wills, property documentation, and encrypted family statements.
              </p>
            </div>
          </div>
        </div>

        <DocumentsView isAdmin={true} hideHeader={true} />
      </div>
    </Layout>
  );
}
