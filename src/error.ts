export class WechatPayError extends Error {
  resStatus: number | undefined;
  resCode: string | undefined;
  resMsg: string | undefined;

  constructor(message: string) {
    super('[WechatPay] ' + message);
  }
}
