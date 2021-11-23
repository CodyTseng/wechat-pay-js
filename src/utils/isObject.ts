export function isObject(obj: any) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}
