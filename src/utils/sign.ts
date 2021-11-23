import * as crypto from 'crypto';

export function sign(cert: Buffer | string, message: string) {
  return crypto
    .createSign('RSA-SHA256')
    .update(message, 'utf-8')
    .sign(cert, 'base64');
}
