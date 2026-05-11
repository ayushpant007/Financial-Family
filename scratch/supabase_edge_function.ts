// Supabase Edge Function: document-processor
// To be deployed to Supabase: `supabase functions deploy document-processor`

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib"
// Note: OCR usually requires an external API like Google Vision in Edge Functions
// because Tesseract.js/WebAssembly might be too large for the memory limit.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const { documentId, clientId, storagePath, fileType } = await req.json()

    // 1. Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath)

    if (downloadError) throw downloadError

    let extractedText = ""
    
    // 2. Extraction Logic (Simplified for demonstration)
    if (fileType === 'pdf') {
      // Basic text extraction from PDF
      // In a real scenario, use a more robust parser compatible with Deno
      extractedText = "[PDF Content Extracted]" 
    } else if (fileType === 'docx') {
      extractedText = "[DOCX Content Extracted]"
    } else {
      // For images, call Google Vision API
      // const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`, ...)
      extractedText = "[Image OCR Extracted]"
    }

    // 3. Masking Logic
    const maskingResult = maskSensitiveData(extractedText)

    // 4. Encrypted Storage (pgsodium encryption happens automatically via DB triggers/views)
    const { error: insertError } = await supabase
      .from('document_extracted_text')
      .insert({
        document_id: documentId,
        client_id: clientId,
        extracted_text: maskingResult.maskedText,
        file_type: fileType,
        masked_fields_log: maskingResult.log
      })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

function maskSensitiveData(text: string) {
  const log: Record<string, boolean> = {};
  let maskedText = text;

  const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  if (aadhaarRegex.test(maskedText)) {
    log.aadhaar = true;
    maskedText = maskedText.replace(aadhaarRegex, (match) => `XXXXXXXX${match.replace(/\s/g, '').slice(-4)}`);
  }

  const panRegex = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g;
  if (panRegex.test(maskedText)) {
    log.pan = true;
    maskedText = maskedText.replace(panRegex, (match) => `XXXXX${match.slice(-5)}`);
  }

  const bankRegex = /\b\d{9,18}\b/g;
  if (bankRegex.test(maskedText)) {
    log.bank_account = true;
    maskedText = maskedText.replace(bankRegex, (match) => `${'X'.repeat(match.length - 4)}${match.slice(-4)}`);
  }

  return { maskedText, log };
}
