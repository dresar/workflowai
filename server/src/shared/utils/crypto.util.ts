import crypto from 'crypto';
import { env } from '../../config/env.config';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = env.ENCRYPTION_KEY;
  return Buffer.from(raw.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH), 'utf8');
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  // If ciphertext is a raw key (no IV prefix colon), return as is
  if (!ciphertext.includes(':')) {
    return ciphertext;
  }
  try {
    const [ivHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !encryptedHex) return ciphertext;
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. key format or encryption key changed), return ciphertext directly
    return ciphertext;
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
