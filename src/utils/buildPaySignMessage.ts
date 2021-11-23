import { TradeType } from '../interface';

export function buildPaySignMessage(
  appId: string,
  timestamp: number,
  nonce: string,
  prepayId: string,
  tradeType: TradeType,
) {
  if (tradeType === 'JSAPI') {
    return `${appId}\n${timestamp}\n${nonce}\nprepay_id=${prepayId}\n`;
  } else if (tradeType === 'APP') {
    return `${appId}\n${timestamp}\n${nonce}\n${prepayId}\n`;
  }
  return '';
}
