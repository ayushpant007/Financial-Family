import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PDFDocument } from "pdf-lib";
import { db, clientsTable } from "@workspace/db";
import { documentsTable } from "@workspace/db/schema";
import { documentExtractedTextTable } from "@workspace/db/schema";
import { ExtractionService } from "../lib/extraction.service";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Supported: ${ALLOWED_EXTENSIONS.join(", ")}`));
    }
  }
});

const router = Router();

// Get all documents (Admin see all, Client see only theirs)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { role, clientId } = (req as any).session;

  try {
    let query = db.select({
      id: documentsTable.id,
      clientId: documentsTable.clientId,
      filename: documentsTable.filename,
      fileType: documentsTable.fileType,
      uploadTimestamp: documentsTable.uploadTimestamp,
      clientName: clientsTable.name,
    })
    .from(documentsTable)
    .leftJoin(clientsTable, eq(documentsTable.clientId, clientsTable.id));

    if (role !== "admin") {
      query = query.where(eq(documentsTable.clientId, clientId!)) as any;
    }

    const documents = await query.orderBy(desc(documentsTable.uploadTimestamp));
    
    const formattedDocs = documents.map(doc => ({
      ...doc,
      client: doc.clientName ? { name: doc.clientName } : undefined
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error("Fetch docs error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Download original file for a document
router.get("/:id/download", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, clientId } = (req as any).session;

  try {
    const docId = parseInt(id as string);
    if (isNaN(docId)) {
      res.status(400).json({ error: "Invalid document ID" });
      return;
    }

    const [doc] = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Security check for clients
    if (role !== "admin" && doc.clientId !== clientId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    if (!doc.storagePath || !fs.existsSync(doc.storagePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };

    const mime = mimeTypes[doc.fileType?.toLowerCase() ?? ""] || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `inline; filename="${doc.filename}"`);
    fs.createReadStream(doc.storagePath).pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Upload and process document
router.post("/upload", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File too large. Max 5MB allowed." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    } else if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const { role, clientId } = (req as any).session;
  const targetClientId = role === "admin" ? parseInt(req.body.clientId) : clientId;

  if (!targetClientId) {
    res.status(400).json({ error: "Target client ID is required" });
    return;
  }

  const filePath = req.file.path;
  const fileExtension = path.extname(req.file.originalname).slice(1);
  const password: string | undefined = req.body.password || undefined;

  try {
    // For PDFs, validate password (and decrypt if password-protected)
    if (fileExtension === 'pdf') {
      await ExtractionService.extractText(filePath, fileExtension, password);

      // If a password was provided and extraction succeeded, strip the
      // password from the PDF so it opens freely after MPIN verification
      if (password) {
        const encryptedBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(encryptedBytes, { password });
        const decryptedBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, decryptedBytes);
      }
    }

    const [document] = await db.insert(documentsTable).values({
      clientId: targetClientId,
      filename: req.file.originalname,
      storagePath: filePath,
      fileType: fileExtension,
    }).returning();

    res.json({ 
      success: true, 
      documentId: document.id
    });
  } catch (error: any) {
    console.error("Upload processing error:", error);
    // Clean up the uploaded temp file on failure
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    if (error.message === "PASSWORD_REQUIRED") {
      res.status(422).json({ error: "PASSWORD_REQUIRED", message: "This PDF is password-protected. Please provide the password to unlock it." });
      return;
    }
    if (error.message === "INVALID_PASSWORD") {
      res.status(422).json({ error: "INVALID_PASSWORD", message: "Invalid password. Please try again." });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Delete a document (and its extraction record + file from disk)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, clientId } = (req as any).session;

  try {
    const docId = parseInt(id as string);
    if (isNaN(docId)) {
      res.status(400).json({ error: "Invalid document ID" });
      return;
    }

    const [doc] = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, docId))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Only admin or the owning client can delete
    if (role !== "admin" && doc.clientId !== clientId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    // Delete the DB record
    await db.delete(documentsTable).where(eq(documentsTable.id, doc.id));

    // Delete file from disk
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try { fs.unlinkSync(doc.storagePath); } catch (e) {
        console.warn("Could not delete file from disk:", e);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete doc error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
