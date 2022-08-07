export type GenerateNonceFunc = (length: number) => string;

export interface WechatpayOptions {
  appId: string;
  mchId: string;
  apiV3Key: string;
  privateKey: string | Buffer;
  serialNo: string;
  needVerify?: boolean;
  nonceLength?: number;
  generateNonceFunc?: GenerateNonceFunc;
  transactionNotifyUrl?: string;
  refundNotifyUrl?: string;
}

export interface WechatpayErrorResponse {
  code: string;
  message: string;
  detail?: any;
}
