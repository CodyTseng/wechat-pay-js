const BaseUrl = 'https://api.mch.weixin.qq.com/v3';

export const EndPoint = {
  Certificate: BaseUrl + '/certificates',
  Transaction: BaseUrl + '/pay/transactions',
  Refund: BaseUrl + '/refund/domestic/refunds',
  Bill: BaseUrl + '/bill',
};

export enum PaymentMethod {
  JSAPI = 'jsapi',
  APP = 'app',
  Native = 'native',
}
