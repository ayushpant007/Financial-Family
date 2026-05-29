import React from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Upload, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Eye,
  Lock,
  Download,
  Trash2,
  KeyRound,
  X,
  LockKeyhole
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { User } from "@workspace/api-client-react";

interface Document {
  id: number;
  clientId: number;
  filename: string;
  fileType: string;
  uploadTimestamp: string;
  client?: { name: string };
}

interface Extraction {
  id: number;
  extractedText: string;
  maskedFieldsLog: Record<string, boolean>;
}

interface UserWithMpin extends User {
  hasMpin?: boolean;
}

const ESSENTIAL_CHECKLIST = [
  { id: "pan", label: "PAN Card", keywords: ["pan"] },
  { id: "aadhaar", label: "Aadhaar Card", keywords: ["aadhar", "adhaar", "uidai"] },
  { id: "will", label: "Will & Succession", keywords: ["will", "trust", "succession", "will.pdf"] },
  { id: "property", label: "Property Papers", keywords: ["property", "house", "land", "deed"] },
  { id: "investment", label: "Investment Certificate", keywords: ["investment", "mutual", "stock", "fd", "bond", "inv", "fund"] },
  { id: "tax", label: "Tax Returns (ITR)", keywords: ["tax", "itr", "income"] },
  { id: "insurance", label: "Insurance Policy", keywords: ["insurance", "policy", "lic"] },
];

const checkDocumentStatus = (docList: Document[]) => {
  return ESSENTIAL_CHECKLIST.map((item) => {
    const isUploaded = docList.some((doc) => {
      const filenameLower = doc.filename.toLowerCase();
      return item.keywords.some((kw) => filenameLower.includes(kw));
    });
    return { ...item, isUploaded };
  });
};

export function DocumentsView({ isAdmin = false, hideHeader = false }: { isAdmin?: boolean; hideHeader?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [targetClientId, setTargetClientId] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [viewingDoc, setViewingDoc] = React.useState<Document | null>(null);
  const [deletingDoc, setDeletingDoc] = React.useState<Document | null>(null);

  // Password prompt state
  const [passwordPromptOpen, setPasswordPromptOpen] = React.useState(false);
  const [pdfPassword, setPdfPassword] = React.useState("");
  const [pendingFormData, setPendingFormData] = React.useState<FormData | null>(null);

  // MPIN state
  const [mpinPromptOpen, setMpinPromptOpen] = React.useState(false);
  const [mpinValue, setMpinValue] = React.useState("");
  const [mpinActionDoc, setMpinActionDoc] = React.useState<Document | null>(null);
  
  const [setMpinOpen, setSetMpinOpen] = React.useState(false);
  const [isMpinGateMode, setIsMpinGateMode] = React.useState(false);
  const [newMpin, setNewMpin] = React.useState("");
  const [isSettingMpin, setIsSettingMpin] = React.useState(false);
  
  // Session-level verification
  const [isMpinVerifiedInSession, setIsMpinVerifiedInSession] = React.useState(false);
  const [shouldShake, setShouldShake] = React.useState(false);

  // Page-level MPIN gate: auto-open setup if user has no MPIN yet
  React.useEffect(() => {
    const currentUser = user as UserWithMpin;
    if (currentUser && currentUser.hasMpin === false) {
      setIsMpinGateMode(true);
      setSetMpinOpen(true);
    }
  }, [user]);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    }
  });

  const { data: clients } = useQuery<any[]>({
    queryKey: ["clients"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    }
  });

  // Extraction removed as per user request
  const extraction = null;
  const isLoadingExtraction = false;

  const doUpload = async (formData: FormData) => {
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) {
      // Special code for password-protected PDFs
      if (body.error === "PASSWORD_REQUIRED") {
        throw Object.assign(new Error(body.message), { code: "PASSWORD_REQUIRED" });
      }
      if (body.error === "INVALID_PASSWORD") {
        throw Object.assign(new Error(body.message), { code: "INVALID_PASSWORD" });
      }
      throw new Error(body.error || "Upload failed");
    }
    return body;
  };

  const uploadMutation = useMutation({
    mutationFn: doUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({
        title: "Success",
        description: "Document uploaded and processed successfully",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
      setTargetClientId("");
      setPdfPassword("");
      setPendingFormData(null);
      setPasswordPromptOpen(false);
    },
    onError: (error: any) => {
      if (error.code === "PASSWORD_REQUIRED") {
        // Open the password dialog and keep the formData so we can retry
        setPasswordPromptOpen(true);
        return;
      }
      if (error.code === "INVALID_PASSWORD") {
        toast({
          variant: "destructive",
          title: "Invalid Password",
          description: "The password you entered is incorrect. Please try again.",
        });
        setPasswordPromptOpen(true);
        return;
      }
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
      setPasswordPromptOpen(false);
    },
    onSettled: () => setIsUploading(false)
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: number) => {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Deleted", description: "Document deleted successfully." });
      setDeletingDoc(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
      setDeletingDoc(null);
    }
  });

  const verifyMpinMutation = useMutation({
    mutationFn: async (mpin: string) => {
      const res = await fetch("/api/auth/verify-mpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpin }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Invalid MPIN");
      }
      return res.json();
    }
  });

  const setMpinMutation = useMutation({
    mutationFn: async (mpin: string) => {
      const res = await fetch("/api/auth/mpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpin }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to set MPIN");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: isMpinGateMode ? "MPIN Created" : "MPIN Updated",
        description: isMpinGateMode
          ? "Your MPIN is set. Enter it each time you want to view a document."
          : "Your MPIN has been updated successfully.",
      });
      setSetMpinOpen(false);
      setNewMpin("");
      setIsMpinGateMode(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const buildFormData = (password?: string) => {
    const formData = new FormData();
    if (!selectedFile) return null;
    formData.append("file", selectedFile);
    if (isAdmin) formData.append("clientId", targetClientId);
    if (password) formData.append("password", password);
    return formData;
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    if (isAdmin && !targetClientId) {
      toast({
        variant: "destructive",
        title: "Selection Required",
        description: "Please select a client",
      });
      return;
    }

    const formData = buildFormData();
    if (!formData) return;
    setPendingFormData(formData);
    setIsUploading(true);
    uploadMutation.mutate(formData);
  };

  const handleUploadWithPassword = () => {
    if (!selectedFile) return;
    const formData = buildFormData(pdfPassword);
    if (!formData) return;
    setPendingFormData(formData);
    setIsUploading(true);
    setPasswordPromptOpen(false);
    uploadMutation.mutate(formData);
  };

  const handleViewFile = (doc: Document) => {
    // If already verified in this session, open immediately
    if (isMpinVerifiedInSession) {
      window.open(`/api/documents/${doc.id}/download`, "_blank");
      return;
    }

    // MPIN is always set by this point (page-level gate ensures it)
    setMpinActionDoc(doc);
    setMpinPromptOpen(true);
  };

  const handleMpinSubmit = () => {
    if (mpinValue.length !== 6) return;

    // Open a blank window immediately to satisfy the browser's interaction check
    // This must happen in the same call stack as the user's click/Enter
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <body style="display:flex;align-items:center;justify-center;height:100vh;font-family:sans-serif;color:#64748b;background:#f8fafc;">
            <div style="text-align:center;width:100%;">
              <p>Unlocking document...</p>
            </div>
          </body>
        </html>
      `);
    }

    verifyMpinMutation.mutate(mpinValue, {
      onSuccess: () => {
        setIsMpinVerifiedInSession(true);
        if (mpinActionDoc) {
          const downloadUrl = `/api/documents/${mpinActionDoc.id}/download`;
          
          if (newWindow && !newWindow.closed) {
            newWindow.location.href = downloadUrl;
          } else {
            // Fallback if the initial open failed or was closed
            window.open(downloadUrl, "_blank");
          }
          
          toast({
            title: "Verification Successful",
            description: "Document unlocked and opened.",
          });
        }
        setMpinPromptOpen(false);
        setMpinValue("");
        setMpinActionDoc(null);
      },
      onError: (err: any) => {
        if (newWindow) newWindow.close();
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
        setMpinValue(""); // clear on error
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: err.message,
        });
      }
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-12 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {!hideHeader ? (
            <>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Secure Documents</h1>
              <p className="text-sm text-slate-500 mt-1">Encrypted storage with MPIN-protected access.</p>
            </>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-slate-900">Vault Registry</h2>
              <p className="text-xs text-slate-500 mt-1">Active processed documents and secure upload portals</p>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-bold text-xs shadow-sm transition-all"
            onClick={() => setSetMpinOpen(true)}
          >
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            { (user as UserWithMpin)?.hasMpin ? "Change MPIN" : "Set MPIN" }
          </Button>
          <Badge variant="outline" className="px-3 py-1 gap-1.5 bg-emerald-50 border-emerald-200 text-emerald-600 self-start sm:self-center h-10 shadow-sm rounded-xl text-xs font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            AES-256 Encrypted
          </Badge>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        {/* Upload Section */}
        <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-base font-bold text-slate-900">Upload New Document</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">Support for PDF, DOCX, and Images (.jpg, .png)</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Select Client</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                >
                  <option value="">Choose a client...</option>
                  {clients?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-slate-700">File</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  selectedFile ? "border-primary bg-primary/5 shadow-inner" : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50/50"
                }`}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className={`mx-auto h-8 w-8 mb-2 ${selectedFile ? "text-primary" : "text-slate-400"}`} />
                <p className="text-sm font-medium text-slate-900">
                  {selectedFile ? selectedFile.name : "Click to select a file"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Max 5MB</p>
                <input 
                  id="file-upload"
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // 1. Check size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      toast({
                        variant: "destructive",
                        title: "File Too Large",
                        description: "File is too large. Max limit is 5MB.",
                      });
                      e.target.value = ""; // Reset
                      return;
                    }

                    // 2. Check extension
                    const allowed = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
                    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
                    if (!allowed.includes(ext)) {
                      toast({
                        variant: "destructive",
                        title: "Unsupported Format",
                        description: `Allowed formats: ${allowed.join(", ")}`,
                      });
                      e.target.value = ""; // Reset
                      return;
                    }

                    setSelectedFile(file);
                    setPdfPassword(""); // reset password on new file
                  }}
                />
              </div>
            </div>

            <Button 
              className="w-full shadow-lg shadow-primary/20 h-11" 
              disabled={!selectedFile || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Dynamic Document Checklist Board */}
        {!isLoading && documents && (
          <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-slate-400" />
                Essential Document Checklist
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Tracks the onboarding status of key regulatory and inheritance documents for the client registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                const checklistStatus = checkDocumentStatus(documents);
                const completedCount = checklistStatus.filter(x => x.isUploaded).length;
                const totalCount = checklistStatus.length;
                const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                
                return (
                  <div className="space-y-4">
                    {/* Progress Indicators */}
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Onboarding Progress</span>
                      <span className="font-black text-slate-900 tabular-nums">{completedCount} of {totalCount} Completed ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-700" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                    
                    {/* Grid layout for checks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      {checklistStatus.map((item) => (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                            item.isUploaded 
                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                              : "bg-slate-50/50 border-slate-100 text-slate-400"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.isUploaded ? "bg-emerald-100 text-emerald-600" : "bg-slate-200/60 text-slate-400"
                          }`}>
                            {item.isUploaded ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${item.isUploaded ? "text-slate-800" : "text-slate-400"}`}>{item.label}</p>
                            <p className="text-[9px] uppercase font-extrabold tracking-widest mt-0.5 opacity-80">
                              {item.isUploaded ? "Uploaded" : "Pending"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Processed Documents List Table */}
        <Card className="border border-slate-200 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-6">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              Processed Documents
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">Recently uploaded files and their extraction status.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center text-slate-500">
                <Clock className="h-8 w-8 animate-spin mr-3" />
                Loading documents...
              </div>
            ) : documents?.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-4 pl-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Document Details</th>
                      <th className="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="p-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest hidden md:table-cell">Upload Date</th>
                      <th className="p-4 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents?.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-all duration-200 group">
                        {/* 1. Document details, filename, and owner client */}
                        <td className="p-4 pl-6 align-middle">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 font-black text-sm group-hover:bg-slate-950 group-hover:text-amber-400 group-hover:border-slate-950 transition-all duration-300">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate max-w-[280px] group-hover:text-amber-600 transition-colors" title={doc.filename}>
                                {doc.filename}
                              </p>
                              {isAdmin && doc.client && (
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-0.5 truncate">
                                  Client: {doc.client.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. File Type Badge */}
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center justify-center text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 uppercase">
                            {doc.fileType}
                          </span>
                        </td>

                        {/* 3. Upload Date */}
                        <td className="p-4 align-middle hidden md:table-cell">
                          <span className="text-xs text-slate-500 tabular-nums">
                            {new Date(doc.uploadTimestamp).toLocaleString()}
                          </span>
                        </td>

                        {/* 4. Actions */}
                        <td className="p-4 pr-6 text-right align-middle">
                          <div className="flex items-center justify-end gap-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingDoc(doc); }}
                              title="Delete Document"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-9 rounded-xl px-4 font-black border-slate-200 text-slate-700 hover:bg-slate-950 hover:text-amber-400 hover:border-slate-950 transition-all shadow-sm cursor-pointer text-[11px] whitespace-nowrap"
                              onClick={() => handleViewFile(doc)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              View File
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MPIN Verification Dialog */}
      <Dialog open={mpinPromptOpen} onOpenChange={(open) => {
        if (!open) { setMpinPromptOpen(false); setMpinValue(""); setMpinActionDoc(null); }
      }}>
        <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Secure Verification
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Enter your 6-digit MPIN to unlock <strong>{mpinActionDoc?.filename}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className={cn("flex flex-col items-center justify-center gap-6 py-6", shouldShake && "animate-shake")}>
            <InputOTP
              maxLength={6}
              value={mpinValue}
              onChange={(value) => setMpinValue(value)}
              onComplete={handleMpinSubmit}
              autoFocus
              type="password"
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
              </InputOTPGroup>
            </InputOTP>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">Verification needed once per session</p>
              <button 
                type="button" 
                onClick={() => {
                  setMpinPromptOpen(false);
                  setMpinValue("");
                  setMpinActionDoc(null);
                  setSetMpinOpen(true);
                }} 
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-bold mt-1 cursor-pointer transition-all bg-transparent border-none outline-none"
              >
                Forgot MPIN? Reset Security MPIN
              </button>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" onClick={() => { setMpinPromptOpen(false); setMpinValue(""); }} className="text-slate-500 hover:text-slate-900">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set/Change MPIN Dialog */}
      <Dialog
        open={setMpinOpen}
        onOpenChange={(open) => {
          // In gate mode, prevent closing — user must set an MPIN
          if (!open && isMpinGateMode) return;
          if (!open) { setSetMpinOpen(false); setNewMpin(""); }
        }}
      >
        <DialogContent
          className="max-w-md bg-white border-slate-200 shadow-2xl"
          // Prevent closing via Escape in gate mode
          onEscapeKeyDown={(e) => { if (isMpinGateMode) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (isMpinGateMode) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-primary" />
              {isMpinGateMode ? "Set Up Your Security MPIN" : (user as UserWithMpin)?.hasMpin ? "Change MPIN" : "Create Security MPIN"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {isMpinGateMode
                ? "Create a 6-digit MPIN to secure access to your documents. You'll enter this once per session to view files."
                : "Choose a 6-digit number to protect your financial documents."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <InputOTP
              maxLength={6}
              value={newMpin}
              onChange={(value) => setNewMpin(value)}
              autoFocus
              type="password"
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl rounded-md border-slate-200 bg-slate-50 text-slate-900" />
              </InputOTPGroup>
            </InputOTP>
            {isMpinGateMode && (
              <p className="text-xs text-slate-400 mt-4 text-center">This is a one-time setup. Remember your MPIN — it cannot be recovered.</p>
            )}
          </div>
          <DialogFooter className="gap-3">
            {!isMpinGateMode && (
              <Button variant="outline" className="flex-1 border-slate-200 text-slate-500" onClick={() => { setSetMpinOpen(false); setNewMpin(""); }}>
                Cancel
              </Button>
            )}
            <Button 
              className="flex-1 shadow-lg shadow-primary/20"
              onClick={() => setMpinMutation.mutate(newMpin)} 
              disabled={newMpin.length !== 6 || setMpinMutation.isPending}
            >
              {setMpinMutation.isPending ? (
                <><Clock className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />{isMpinGateMode ? "Activate MPIN" : "Set MPIN"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Prompt Dialog */}
      <Dialog open={passwordPromptOpen} onOpenChange={(open) => {
        if (!open) { setPasswordPromptOpen(false); setIsUploading(false); }
      }}>
        <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-primary" />
              Password Protected PDF
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              <strong>{selectedFile?.name}</strong> is encrypted. Enter the PDF password to unlock and process it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label htmlFor="pdf-password" className="text-slate-700">PDF Password</Label>
            <Input
              id="pdf-password"
              type="password"
              placeholder="Enter document password..."
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUploadWithPassword(); }}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-500" onClick={() => { setPasswordPromptOpen(false); setIsUploading(false); }}>
              Cancel
            </Button>
            <Button onClick={handleUploadWithPassword} disabled={!pdfPassword || isUploading} className="shadow-lg shadow-primary/20">
              {isUploading ? (
                <><Clock className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Unlock & Upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDoc} onOpenChange={(open) => { if (!open) setDeletingDoc(null); }}>
        <DialogContent className="max-w-sm bg-white border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Delete Document
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete <strong>{deletingDoc?.filename}</strong>?
              This will permanently remove the file and all extracted data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-500" onClick={() => setDeletingDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="shadow-lg shadow-rose-500/20"
              onClick={() => deletingDoc && deleteMutation.mutate(deletingDoc.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <><Clock className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" />Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
