export function buildVerifyMessage(
  timestamp: string,
  nonceStr: string,
  dataStr: string,
) {
  return `${timestamp}\n${nonceStr}\n${dataStr}\n`;
}
