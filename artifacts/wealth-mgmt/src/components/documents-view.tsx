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

export function DocumentsView({ isAdmin = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

    verifyMpinMutation.mutate(mpinValue, {
      onSuccess: () => {
        setIsMpinVerifiedInSession(true);
        if (mpinActionDoc) {
          toast({
            title: "Verification Successful",
            description: "Opening file in 5 seconds...",
          });
          setTimeout(() => {
            window.open(`/api/documents/${mpinActionDoc.id}/download`, "_blank");
          }, 5000);
        }
        setMpinPromptOpen(false);
        setMpinValue("");
        setMpinActionDoc(null);
      },
      onError: (err: any) => {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Secure Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Encrypted storage with MPIN-protected access.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="gap-2 h-11 md:h-10 border-slate-200 bg-white hover:bg-slate-50"
            onClick={() => setSetMpinOpen(true)}
          >
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            { (user as UserWithMpin)?.hasMpin ? "Change MPIN" : "Set MPIN" }
          </Button>
          <Badge variant="outline" className="px-3 py-2 md:py-1 gap-2 bg-primary/10 border-primary/20 text-primary self-start sm:self-center h-11 md:h-10 shadow-sm shadow-primary/5">
            <ShieldCheck className="h-4 w-4" />
            AES-256 Encrypted
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Upload Section */}
        <Card className="lg:col-span-1 border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Upload New Document</CardTitle>
            <CardDescription className="text-slate-500">Support for PDF, DOCX, and Images (.jpg, .png)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label className="text-slate-700">Select Client</Label>
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

        {/* History List */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Processed Documents</CardTitle>
            <CardDescription className="text-slate-500">Recently uploaded files and their extraction status.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <Clock className="h-8 w-8 animate-spin mr-3" />
                Loading documents...
              </div>
            ) : documents?.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dotted border-slate-100 rounded-xl bg-slate-50/30">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">No documents uploaded yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate max-w-[200px] text-slate-900">{doc.filename}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200">
                              {doc.fileType}
                            </Badge>
                            <span className="text-[11px] text-slate-500">
                              {new Date(doc.uploadTimestamp).toLocaleString()}
                            </span>
                            {isAdmin && (
                              <span className="text-[11px] font-medium text-primary">
                                • {doc.client?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all"
                          title="View original file"
                          onClick={() => handleViewFile(doc)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">View File</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100 hover:border-rose-200 transition-all"
                          title="Delete document"
                          onClick={() => setDeletingDoc(doc)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
            <p className="text-xs text-slate-500">Verification needed once per session</p>
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
