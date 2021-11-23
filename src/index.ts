import * as crypto from 'crypto';
import * as fs from 'fs';
import * as urllib from 'urllib';
import {
  buildPaySignMessage,
  buildRequestMessage,
  buildVerifyMessage,
  generateNonce,
  sign,
  verify,
} from './utils';
import {
  TradeType,
  CreateTransactionOptions,
  CreateTransactionResult,
  TransactionDetails,
  CreateRefundOptions,
  RefundDetails,
  WechatPayOptions,
  WechatPayCert,
  TradeBillResult,
  FundFlowBillResult,
  GenerateNonceFunc,
} from './interface';
import { WechatPayError } from './error';
import {
  CertificatesUrl,
  CloseTransactionUrl,
  CreateTransactionUrl,
  FundFlowBillUrl,
  QueryRefundUrl,
  QueryTransactionByOutTradeNoUrl,
  QueryTransactionUrl,
  RefundUrl,
  TradeBillUrl,
} from './urls';
import { buildToken } from './utils/buildToken';

export class WechatPay {
  private _appId: string;
  private _mchId: string;
  private _apiV3Key: string;
  private _privateKey: Buffer;
  private _serialNo: string;
  private _tradeType: TradeType;
  private _certs: WechatPayCert[];
  private _needVerify: boolean;
  private _nonceLength: number;
  private _generateNonceFunc: GenerateNonceFunc;

  constructor(options: WechatPayOptions) {
    this._appId = options.appId;
    this._mchId = options.mchId;
    this._apiV3Key = options.apiV3Key;
    this._privateKey = fs.readFileSync(options.privateKeyPath);
    this._serialNo = options.serialNo;
    this._tradeType = options.tradeType;
    this._needVerify = options.needVerify || false;
    this._certs = [];
    this._nonceLength = options.nonceLength || 16;
    this._generateNonceFunc = options.generateNonceFunc || generateNonce;
    if (this._needVerify) {
      this.updateCerts();
    }
  }

  get appId() {
    return this._appId;
  }

  get mchId() {
    return this._mchId;
  }

  get tradeType() {
    return this._tradeType;
  }

  async request(
    method: urllib.HttpMethod,
    url: string,
    body?: any,
  ): Promise<any> {
    const bodyStr = body ? JSON.stringify(body) : '';
    const token = this._getToken(method, url, bodyStr);
    const options = {
      method,
      headers: {
        authorization: `WECHATPAY2-SHA256-RSA2048 ${token}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      data: body,
    };

    let result: any;
    try {
      result = await urllib.request(url, options);
    } catch (err) {
      throw new WechatPayError('http request failed');
    }

    if (result.status !== 200 && result.status !== 204) {
      let errorMessage = `wechat pay api request failed status:${result.status}`;
      const { code, message } = JSON.parse(result.data);

      if (code) {
        errorMessage += ` code:${code}`;
      }
      if (message) {
        errorMessage += ` message:${message}`;
      }
      const err = new WechatPayError(errorMessage);
      err.resStatus = result.status;
      err.resCode = code;
      err.resMsg = message;

      throw err;
    }

    if (result.headers['content-type'].split(';')[0] !== 'application/json') {
      return result.data;
    }

    if (this._needVerify && this._certs.length > 0) {
      const message = buildVerifyMessage(
        result.headers['wechatpay-timestamp'],
        result.headers['wechatpay-nonce'],
        result.data.toString(),
      );
      const cert = this._certs.find(
        (item) => item.serial_no === result.headers['wechatpay-serial'],
      );
      if (!cert) {
        throw new WechatPayError('cert not found');
      }
      const verifyResult = verify(
        cert.certificate,
        message,
        result.headers['wechatpay-signature'],
      );
      if (!verifyResult) {
        throw new WechatPayError('response verify fail');
      }
    }

    return result.data.length ? JSON.parse(result.data) : {};
  }

  async decipher(ciphertext: string, associatedData: string, nonceStr: string) {
    const buff = Buffer.from(ciphertext, 'base64');

    const authTag = buff.slice(buff.length - 16);
    const data = buff.slice(0, buff.length - 16);

    const _decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this._apiV3Key,
      nonceStr,
    );
    _decipher.setAuthTag(authTag);
    _decipher.setAAD(Buffer.from(associatedData));

    const decoded = _decipher.update(data, undefined, 'utf8');

    _decipher.final();
    return decoded;
  }

  async updateCerts() {
    const res = await this.request('GET', CertificatesUrl());

    this._certs = [];
    for (const item of res.data) {
      const { encrypt_certificate, ...info } = item;
      const certificate = await this.decipher(
        encrypt_certificate.ciphertext,
        encrypt_certificate.associated_data,
        encrypt_certificate.nonce,
      );
      this._certs.push(Object.assign(info, { certificate }));
    }
  }

  async createTransaction(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionResult> {
    if (this._tradeType === 'JSAPI' && !options.payer?.openid) {
      throw new WechatPayError('create jsapi transaction need openid');
    }

    return await this.request(
      'POST',
      CreateTransactionUrl(this._tradeType),
      Object.assign(options, {
        appid: this._appId,
        mchid: this._mchId,
      }),
    );
  }

  async queryTransaction(id: string): Promise<TransactionDetails> {
    return await this.request('GET', QueryTransactionUrl(id, this._mchId));
  }

  async queryTransactionByOutTradeNo(
    outTradeNo: string,
  ): Promise<TransactionDetails> {
    return await this.request(
      'GET',
      QueryTransactionByOutTradeNoUrl(outTradeNo, this._mchId),
    );
  }

  async closeTransaction(outTradeNo: string): Promise<void> {
    await this.request('POST', CloseTransactionUrl(outTradeNo), {
      mchid: this._mchId,
    });
  }

  async createRefund(options: CreateRefundOptions): Promise<RefundDetails> {
    if (!options.out_refund_no && !options.transaction_id) {
      throw new WechatPayError('missing out_trade_no or transaction_id');
    }

    return await this.request('POST', RefundUrl(), options);
  }

  async queryRefund(outRefundNo: string): Promise<RefundDetails> {
    return await this.request('GET', QueryRefundUrl(outRefundNo));
  }

  async tradeBill(
    billDate: string,
    billType: 'ALL' | 'SUCCESS' | 'REFUND' = 'ALL',
    tarType?: 'GZIP',
  ): Promise<TradeBillResult> {
    return await this.request('GET', TradeBillUrl(billDate, billType, tarType));
  }

  async fundFlowBill(
    billDate: string,
    accountType: 'BASIC' | 'OPERATION' | 'FEES' = 'BASIC',
    tarType?: 'GZIP',
  ): Promise<FundFlowBillResult> {
    return await this.request(
      'GET',
      FundFlowBillUrl(billDate, accountType, tarType),
    );
  }

  async download(downloadUrl: string): Promise<Buffer> {
    return await this.request('GET', downloadUrl);
  }

  getPaySign(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = this._generateNonceFunc(this._nonceLength);
    const message = buildPaySignMessage(
      this._appId,
      timestamp,
      nonceStr,
      prepayId,
      this._tradeType,
    );
    const paySign = sign(this._privateKey, message);

    return {
      appId: this._appId,
      mchId: this._mchId,
      timestamp,
      nonceStr,
      signType: 'RSA',
      paySign,
    };
  }

  private _getToken(method: urllib.HttpMethod, url: string, bodyStr: string) {
    const nonceStr = this._generateNonceFunc(this._nonceLength);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildRequestMessage(
      method,
      url,
      timestamp,
      nonceStr,
      bodyStr,
    );
    const signature = sign(this._privateKey, message);

    return buildToken(
      this._mchId,
      nonceStr,
      timestamp,
      this._serialNo,
      signature,
    );
  }
}
