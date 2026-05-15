import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { isOleCfb } from './docx-decrypt.js';

export class ExtractionService {
  /**
   * Extracts text from a file based on its extension.
   * Uses lazy imports so nothing is loaded at module startup.
   */
  static async extractText(filePath: string, fileType: string, password?: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);

    switch (fileType.toLowerCase()) {
      case 'pdf':
        return this.extractFromPdf(buffer, password);
      case 'docx':
        return this.extractFromDocx(buffer, password);
      case 'jpg':
      case 'jpeg':
      case 'png':
        return this.extractFromImage(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static async extractFromPdf(buffer: Buffer, password?: string): Promise<string> {
    const require = createRequire(import.meta.url);
    // Use the bundled pdf.js from pdf-parse but call it correctly with password support
    const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
    PDFJS.disableWorker = true;

    let doc: any;
    try {
      doc = await PDFJS.getDocument({
        data: new Uint8Array(buffer),
        password: password
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
        if (password) {
          throw new Error('INVALID_PASSWORD');
        }
        throw new Error('PASSWORD_REQUIRED');
      }
      throw err;
    }

    try {
      let text = '';
      const counter = doc.numPages;
      
      for (let i = 1; i <= counter; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n';
      }

      await doc.destroy();
      
      if (text.trim().length < 10) {
        console.log('PDF text layer empty or too short (possibly a scanned PDF)');
      }
      
      return text;
    } catch (err) {
      console.error('PDF extraction error:', err);
      return '';
    }
  }

  private static async extractFromDocx(buffer: Buffer, password?: string): Promise<string> {
    // Detect OLE/CFB wrapping — the signature of an encrypted Office document
    if (isOleCfb(buffer)) {
      if (!password) throw new Error('PASSWORD_REQUIRED');
      // If password supplied, the caller should have already decrypted the buffer
      // before reaching here. If we still see CFB here, the password was wrong.
      throw new Error('INVALID_PASSWORD');
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private static async extractFromImage(_filePath: string): Promise<string> {
    // Full OCR requires Tesseract binaries installed on the server.
    // Replace this stub with a child_process call or Google Vision API
    // when deploying to production.
    return '[Image uploaded – OCR not available in this environment]';
  }

  /**
   * Masks sensitive data in the extracted text before storage.
   */
  static maskSensitiveData(text: string): { maskedText: string; log: Record<string, boolean> } {
    const log: Record<string, boolean> = {};
    let maskedText = text;

    // Aadhaar: 12 digits (with optional spaces every 4 digits)
    const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
    if (aadhaarRegex.test(maskedText)) {
      log.aadhaar = true;
      maskedText = maskedText.replace(/\b(\d{4}\s?\d{4}\s?)(\d{4})\b/g, (_m, _p1, last4) => {
        return `XXXXXXXX${last4}`;
      });
    }

    // PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    const panRegex = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g;
    if (panRegex.test(maskedText)) {
      log.pan = true;
      maskedText = maskedText.replace(panRegex, (match) => {
        return `XXXXX${match.slice(-5)}`;
      });
    }

    // Bank Account: 9–18 digits (only match standalone numbers)
    const bankRegex = /\b\d{9,18}\b/g;
    if (bankRegex.test(maskedText)) {
      log.bank_account = true;
      maskedText = maskedText.replace(bankRegex, (match) => {
        return `${'X'.repeat(match.length - 4)}${match.slice(-4)}`;
      });
    }

    return { maskedText, log };
  }
}
