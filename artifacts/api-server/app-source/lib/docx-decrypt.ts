import crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const HASH_ALG_MAP: Record<string, string> = {
  SHA512: "sha512",
  SHA256: "sha256",
  SHA384: "sha384",
  SHA1: "sha1",
};

function getAttr(xml: string, name: string): string {
  const m = xml.match(new RegExp(`${name}="([^"]+)"`));
  if (!m) throw new Error(`EncryptionInfo missing attribute: ${name}`);
  return m[1];
}

/**
 * Derives a key using the ECMA-376 password-based key derivation.
 * H0 = Hash(salt + UTF-16LE(password))
 * Hi = Hash(uint32LE(i) + H_{i-1})  for i in [0, spinCount)
 * Hfinal = Hash(Hspun + blockKey),  truncated/padded to keyBits/8 bytes
 */
function deriveKey(
  hashAlg: string,
  password: string,
  salt: Buffer,
  spinCount: number,
  blockKey: Buffer,
  keyBytes: number
): Buffer {
  const pwd = Buffer.from(password, "utf16le");
  let h = crypto.createHash(hashAlg).update(salt).update(pwd).digest();

  const ibuf = Buffer.alloc(4);
  for (let i = 0; i < spinCount; i++) {
    ibuf.writeUInt32LE(i, 0);
    h = crypto.createHash(hashAlg).update(ibuf).update(h).digest();
  }

  h = crypto.createHash(hashAlg).update(h).update(blockKey).digest();

  if (h.length >= keyBytes) return h.subarray(0, keyBytes);
  const padded = Buffer.alloc(keyBytes);
  for (let i = 0; i < keyBytes; i++) padded[i] = h[i % h.length];
  return padded;
}

function aesCbcDecrypt(key: Buffer, iv: Buffer, data: Buffer): Buffer {
  const bits = key.length * 8;
  const d = crypto.createDecipheriv(`aes-${bits}-cbc`, key, iv);
  d.setAutoPadding(false);
  return Buffer.concat([d.update(data), d.final()]);
}

/**
 * Detects whether a buffer is an OLE/CFB compound file
 * (the wrapping format used when Office files are password-protected).
 */
export function isOleCfb(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0
  );
}

/**
 * Decrypts an ECMA-376 Agile Encrypted Office document (DOCX, XLSX, PPTX …).
 * Returns the raw decrypted ZIP bytes (the actual Office Open XML package).
 *
 * Throws "INVALID_PASSWORD" if the password is wrong,
 * or rethrows unexpected errors.
 */
export async function decryptOOXML(buf: Buffer, password: string): Promise<Buffer> {
  const CFB = require("cfb");

  let cfb: any;
  try {
    cfb = CFB.read(buf, { type: "buffer" });
  } catch {
    throw new Error("Not a valid OLE/CFB container");
  }

  const encInfoEntry = CFB.find(cfb, "/EncryptionInfo");
  const encPackageEntry = CFB.find(cfb, "/EncryptedPackage");
  if (!encInfoEntry || !encPackageEntry) {
    throw new Error("Not an encrypted Office document");
  }

  const infoBuf = Buffer.isBuffer(encInfoEntry.content)
    ? encInfoEntry.content
    : Buffer.from(encInfoEntry.content);

  const xmlIdx = infoBuf.indexOf(Buffer.from("<", "ascii"));
  if (xmlIdx < 0) throw new Error("Cannot locate EncryptionInfo XML");
  const xmlStr = infoBuf.subarray(xmlIdx).toString("utf8");

  const encKeyMatch = xmlStr.match(/<(?:[a-z]+:)?encryptedKey[^>]+>/i);
  if (!encKeyMatch) throw new Error("Cannot parse encryptedKey element");
  const ekXml = encKeyMatch[0];

  const kdMatch = xmlStr.match(/<keyData[^>]+>/i);
  if (!kdMatch) throw new Error("Cannot parse keyData element");
  const kdXml = kdMatch[0];

  const ekHashAlg = HASH_ALG_MAP[getAttr(ekXml, "hashAlgorithm")] ?? getAttr(ekXml, "hashAlgorithm").toLowerCase();
  const ekSpinCount = parseInt(getAttr(ekXml, "spinCount"), 10);
  const ekSalt = Buffer.from(getAttr(ekXml, "saltValue"), "base64");
  const ekKeyBits = parseInt(getAttr(ekXml, "keyBits"), 10);
  const ekBlockSize = parseInt(getAttr(ekXml, "blockSize"), 10);
  const encKeyValue = Buffer.from(getAttr(ekXml, "encryptedKeyValue"), "base64");
  const encVerifierInput = Buffer.from(getAttr(ekXml, "encryptedVerifierHashInput"), "base64");
  const encVerifierHash = Buffer.from(getAttr(ekXml, "encryptedVerifierHash"), "base64");

  const kdHashAlg = HASH_ALG_MAP[getAttr(kdXml, "hashAlgorithm")] ?? getAttr(kdXml, "hashAlgorithm").toLowerCase();
  const kdSalt = Buffer.from(getAttr(kdXml, "saltValue"), "base64");
  const kdKeyBits = parseInt(getAttr(kdXml, "keyBits"), 10);
  const kdBlockSize = parseInt(getAttr(kdXml, "blockSize"), 10);

  // Block keys defined in ECMA-376 §2.3.4.11
  const BK_KEY       = Buffer.from([0x14, 0x6f, 0x07, 0x76, 0x35, 0x34, 0x58, 0x09]);
  const BK_VERIFIER  = Buffer.from([0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79]);
  const BK_VFY_HASH  = Buffer.from([0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e]);

  const keyEncKey     = deriveKey(ekHashAlg, password, ekSalt, ekSpinCount, BK_KEY,      ekKeyBits / 8);
  const verifierKey   = deriveKey(ekHashAlg, password, ekSalt, ekSpinCount, BK_VERIFIER, ekKeyBits / 8);
  const verifierHKey  = deriveKey(ekHashAlg, password, ekSalt, ekSpinCount, BK_VFY_HASH, ekKeyBits / 8);

  const iv = ekSalt.subarray(0, ekBlockSize);

  const decryptedKey        = aesCbcDecrypt(keyEncKey,    iv, encKeyValue).subarray(0, ekKeyBits / 8);
  const decVerifierInput    = aesCbcDecrypt(verifierKey,  iv, encVerifierInput);
  const decVerifierHash     = aesCbcDecrypt(verifierHKey, iv, encVerifierHash);

  const computedHash = crypto.createHash(ekHashAlg).update(decVerifierInput).digest();
  const expectedHash = decVerifierHash.subarray(0, computedHash.length);

  if (!crypto.timingSafeEqual(computedHash, expectedHash)) {
    throw new Error("INVALID_PASSWORD");
  }

  // Decrypt the encrypted package in 4096-byte segments
  const encPkg = Buffer.isBuffer(encPackageEntry.content)
    ? encPackageEntry.content
    : Buffer.from(encPackageEntry.content);

  const decryptedSize = Number(encPkg.readBigUInt64LE(0));
  const encData = encPkg.subarray(8);

  const SEG = 4096;
  const chunks: Buffer[] = [];
  const segIdxBuf = Buffer.alloc(4);

  for (let seg = 0; seg * SEG < encData.length; seg++) {
    const chunk = encData.subarray(seg * SEG, (seg + 1) * SEG);
    segIdxBuf.writeUInt32LE(seg, 0);

    let segIv = crypto.createHash(kdHashAlg).update(kdSalt).update(segIdxBuf).digest();
    segIv = segIv.subarray(0, kdBlockSize);

    chunks.push(aesCbcDecrypt(decryptedKey, segIv, chunk));
  }

  return Buffer.concat(chunks).subarray(0, decryptedSize);
}
