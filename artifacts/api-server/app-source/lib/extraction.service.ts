import mammoth from 'mammoth';
import fs from 'fs';

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
        return this.extractFromDocx(buffer);
      case 'jpg':
      case 'jpeg':
      case 'png':
        return this.extractFromImage(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static async extractFromPdf(buffer: Buffer, password?: string): Promise<string> {
    // Lazy require avoids the test-file read that pdf-parse v1 does at import time
    const { default: pdfParse } = await import('pdf-parse');
    const options: Record<string, unknown> = {};
    if (password) {
      options.password = password;
    }
    let data: any;
    try {
      data = await pdfParse(buffer, options);
    } catch (err: any) {
      // Re-throw with a clear message so the route can surface it to the client
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
        throw new Error('PASSWORD_REQUIRED');
      }
      throw err;
    }
    if (!data.text || data.text.trim().length < 10) {
      console.log('PDF text layer empty or too short (possibly a scanned PDF)');
      return data.text || '';
    }
    return data.text;
  }

  private static async extractFromDocx(buffer: Buffer): Promise<string> {
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
