export function generateNonce(length = 16) {
  let ret = '';
  const seed = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < length; i++) {
    ret += seed.charAt(Math.floor(Math.random() * seed.length));
  }

  return ret;
}