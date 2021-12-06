export class WechatpayError extends Error {
  constructor(message: string) {
    super('[wechatpay] ' + message);
  }
}
