import { PaymentMethod } from '../contants';

export function buildPaySignMessage(
  appId: string,
  timestamp: number,
  nonce: string,
  prepayId: string,
  paymentMethod: PaymentMethod,
) {
  if (paymentMethod === PaymentMethod.JSAPI) {
    return `${appId}\n${timestamp}\n${nonce}\nprepay_id=${prepayId}\n`;
  } else if (paymentMethod === PaymentMethod.APP) {
    return `${appId}\n${timestamp}\n${nonce}\n${prepayId}\n`;
  }
  return '';
}
