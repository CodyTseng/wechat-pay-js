import { AppIdType } from './common.interface';

export type GenerateNonceFunc = (length: number) => string;

export interface WechatpayOptions {
  appId: string;
  mchId: string;
  apiV3Key: string;
  privateKeyPath: string;
  serialNo: string;
  appIdType: AppIdType;
  needVerify?: boolean;
  nonceLength?: number;
  generateNonceFunc?: GenerateNonceFunc;
}
