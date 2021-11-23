export function buildToken(
  mchId: string,
  nonceStr: string,
  timestamp: number,
  serialNo: string,
  signature: string,
) {
  return `mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}
