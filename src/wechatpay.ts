import axios, { Method, AxiosResponse } from 'axios';
import { merge } from 'lodash';
import {
  Certificate,
  CreateTransactionAPPResult,
  CreateTransactionJSAPIResult,
  CreateTransactionNativeResult,
  CreateTransactionOptions,
  CreateTransactionResult,
  GenerateNonceFunc,
  QueryCertificatesResult,
  WechatpayOptions,
} from './interfaces';
import {
  buildRequestMessage,
  buildToken,
  buildVerifyMessage,
  generateNonce,
  Require,
  sign,
  verify,
} from './utils';
import * as crypto from 'crypto';
import { CertificatesUrl, CreateTransactionUrl } from './urls';
import { PaymentMethod } from './contants';
import { WechatpayError } from './error';

export class Wechatpay {
  private _appId: string;
  private _mchId: string;
  private _apiV3Key: string;
  private _privateKey: Buffer;
  private _serialNo: string;
  private _needVerify: boolean;
  private _nonceLength: number;
  private _generateNonceFunc: GenerateNonceFunc;
  private _transactionNotifyUrl?: string;
  private _refundNotifyUrl?: string;
  private _certs: Certificate[] = [];

  constructor(options: WechatpayOptions) {
    this._appId = options.appId;
    this._mchId = options.mchId;
    this._apiV3Key = options.apiV3Key;
    this._privateKey =
      'string' === typeof options.privateKey
        ? Buffer.from(options.privateKey, 'base64')
        : options.privateKey;
    this._serialNo = options.serialNo;
    this._needVerify =
      options.needVerify == undefined ? true : options.needVerify;
    this._nonceLength = options.nonceLength || 16;
    this._generateNonceFunc = options.generateNonceFunc || generateNonce;
    this._transactionNotifyUrl = options.transactionNotifyUrl;
    this._refundNotifyUrl = options.refundNotifyUrl;
  }

  async _request<R = void, D = any>(method: Method, url: string, data?: D) {
    const dataStr = data ? JSON.stringify(data) : '';
    const token = this.getToken(method, url, dataStr);
    const result = await axios.request<R, AxiosResponse<R, D>, D>({
      method,
      url,
      data,
      headers: {
        authorization: `WECHATPAY2-SHA256-RSA2048 ${token}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
    });

    if (this._needVerify && this._certs.length > 0) {
      const message = buildVerifyMessage(
        result.headers['wechatpay-timestamp'],
        result.headers['wechatpay-nonce'],
        result.data ? JSON.stringify(result.data) : '',
      );
      const cert = this._certs.find(
        (item) => item.serial_no === result.headers['wechatpay-serial'],
      );
      if (!cert) {
        throw new WechatpayError('微信支付 API 响应结果证书不正确');
      }
      const verifyResult = verify(
        cert.certificate,
        message,
        result.headers['wechatpay-signature'],
      );
      if (!verifyResult) {
        throw new WechatpayError('微信支付 API 响应结果签名验证失败');
      }
    }

    return result.data;
  }

  async updateCerts() {
    const res = await this._request<QueryCertificatesResult>(
      'GET',
      CertificatesUrl(),
    );

    this._certs = res.data.map((item) => {
      const { encrypt_certificate, ...info } = item;
      const certificate = this.decipher(
        encrypt_certificate.ciphertext,
        encrypt_certificate.associated_data,
        encrypt_certificate.nonce,
      );
      return Object.assign(info, { certificate });
    });
  }

  async createTransactionJSAPI(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionJSAPIResult>;
  async createTransactionJSAPI(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    openId: string,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionJSAPIResult>;
  async createTransactionJSAPI(
    optionsOrOutTradeNo: string | Require<CreateTransactionOptions, 'payer'>,
    description?: string,
    totalAmount?: number,
    openId?: string,
    options?: Partial<CreateTransactionOptions>,
  ) {
    if ('string' !== typeof optionsOrOutTradeNo) {
      options = optionsOrOutTradeNo;
    } else {
      options = merge(
        {
          description,
          out_trade_no: optionsOrOutTradeNo,
          amount: {
            total: totalAmount,
          },
          payer: {
            openid: openId,
          },
        } as CreateTransactionOptions,
        options,
      );
    }
    return await this.createTransaction(
      options as CreateTransactionOptions,
      PaymentMethod.JSAPI,
    );
  }

  async createTransactionAPP(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionAPPResult>;
  async createTransactionAPP(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionAPPResult>;
  async createTransactionAPP(
    optionsOrOutTradeNo: string | CreateTransactionOptions,
    description?: string,
    totalAmount?: number,
    options?: Partial<CreateTransactionOptions>,
  ) {
    if ('string' !== typeof optionsOrOutTradeNo) {
      options = optionsOrOutTradeNo;
    } else {
      options = merge(
        {
          description,
          out_trade_no: optionsOrOutTradeNo,
          amount: {
            total: totalAmount,
          },
        } as CreateTransactionOptions,
        options,
      );
    }
    return await this.createTransaction(
      options as CreateTransactionOptions,
      PaymentMethod.APP,
    );
  }

  async createTransactionNative(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionNativeResult>;
  async createTransactionNative(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionNativeResult>;
  async createTransactionNative(
    optionsOrOutTradeNo: string | CreateTransactionOptions,
    description?: string,
    totalAmount?: number,
    options?: Partial<CreateTransactionOptions>,
  ) {
    if ('string' !== typeof optionsOrOutTradeNo) {
      options = optionsOrOutTradeNo;
    } else {
      options = merge(
        {
          description,
          out_trade_no: optionsOrOutTradeNo,
          amount: {
            total: totalAmount,
          },
        } as CreateTransactionOptions,
        options,
      );
    }
    return await this.createTransaction(
      options as CreateTransactionOptions,
      PaymentMethod.Native,
    );
  }

  private async createTransaction(
    options: CreateTransactionOptions,
    paymentMethod: PaymentMethod,
  ) {
    return await this._request<CreateTransactionResult>(
      'POST',
      CreateTransactionUrl(paymentMethod),
      Object.assign(
        {
          appid: this._appId,
          mchid: this._mchId,
          notify_url: this._transactionNotifyUrl,
        },
        options,
      ),
    );
  }

  private getToken(method: Method, url: string, dataStr: string) {
    const nonceStr = this._generateNonceFunc(this._nonceLength);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildRequestMessage(
      method,
      url,
      timestamp,
      nonceStr,
      dataStr,
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

  private decipher(
    ciphertext: string,
    associatedData: string,
    nonceStr: string,
  ) {
    const buff = Buffer.from(ciphertext, 'base64');

    const authTag = buff.subarray(buff.length - 16);
    const data = buff.subarray(0, buff.length - 16);

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
}
