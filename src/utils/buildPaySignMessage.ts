import { AppIdType } from '../interfaces';

export function buildPaySignMessage(
  appId: string,
  timestamp: number,
  nonce: string,
  prepayId: string,
  appIdType: AppIdType,
) {
  if (appIdType === 'JSAPI') {
    return `${appId}\n${timestamp}\n${nonce}\nprepay_id=${prepayId}\n`;
  } else if (appIdType === 'APP') {
    return `${appId}\n${timestamp}\n${nonce}\n${prepayId}\n`;
  }
  return '';
}
