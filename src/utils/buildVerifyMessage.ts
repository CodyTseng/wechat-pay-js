export function buildVerifyMessage(
  timestamp: number,
  nonceStr: string,
  bodyStr: string,
) {
  return `${timestamp}\n${nonceStr}\n${bodyStr}\n`;
}
