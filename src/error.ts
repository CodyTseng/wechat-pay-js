export class WechatPayError extends Error {
  constructor(message: string) {
    super('[wechat-pay] ' + message);
  }
}
