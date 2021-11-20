import * as crypto from 'crypto';

export function verify(
  cert: Buffer | string,
  message: string,
  signature: string,
) {
  return crypto
    .createVerify('RSA-SHA256')
    .update(message)
    .verify(cert, signature, 'base64');
}