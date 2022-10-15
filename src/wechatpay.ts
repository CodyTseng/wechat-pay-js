import axios, { Method, AxiosResponse } from 'axios';
import { merge } from 'lodash';
import {
  AccountType,
  BillType,
  Certificate,
  CreateRefundOptions,
  CreateTransactionAPPResult,
  CreateTransactionJSAPIResult,
  CreateTransactionNativeResult,
  CreateTransactionOptions,
  CreateTransactionResult,
  DownloadInfo,
  GenerateNonceFunc,
  QueryCertificatesResult,
  RefundDetails,
  TransactionDetails,
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
import {
  CertificatesUrl,
  CloseTransactionUrl,
  CreateTransactionUrl,
  FundFlowBillUrl,
  GetTransactionByOutTradeNoUrl,
  GetTransactionByTransactionIdUrl,
  QueryRefundUrl,
  RefundUrl,
  TradeBillUrl,
} from './urls';
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

  async _request<R = void, D = any>(
    method: Method,
    url: string,
    data?: D,
    skipVerify = false,
  ) {
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

    if (this._needVerify && this._certs.length > 0 && !skipVerify) {
      if (this._certs.length <= 0) {
        throw new WechatpayError('未调用 updateCerts 方法更新证书');
      }
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
      undefined,
      true,
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

  async createJSAPITransaction(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionJSAPIResult>;
  async createJSAPITransaction(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    openId: string,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionJSAPIResult>;
  async createJSAPITransaction(
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

  async createAPPTransaction(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionAPPResult>;
  async createAPPTransaction(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionAPPResult>;
  async createAPPTransaction(
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

  async createNativeTransaction(
    options: CreateTransactionOptions,
  ): Promise<CreateTransactionNativeResult>;
  async createNativeTransaction(
    outTradeNo: string,
    description: string,
    totalAmount: number,
    options?: Partial<CreateTransactionOptions>,
  ): Promise<CreateTransactionNativeResult>;
  async createNativeTransaction(
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

  async getTransactionByTransactionId(transactionId: string) {
    return await this._request<TransactionDetails>(
      'GET',
      GetTransactionByTransactionIdUrl(transactionId, this._mchId),
    );
  }

  async getTransactionByOutTradeNo(outTradeNo: string) {
    return await this._request<TransactionDetails>(
      'GET',
      GetTransactionByOutTradeNoUrl(outTradeNo, this._mchId),
    );
  }

  async closeTransaction(outTradeNo: string) {
    return await this._request<void>('POST', CloseTransactionUrl(outTradeNo), {
      mchid: this._mchId,
    });
  }

  async createRefund(options: CreateRefundOptions): Promise<RefundDetails>;
  async createRefund(
    outRefundNo: string,
    refundAmount: number,
    totalAmount: number,
    options: Partial<CreateRefundOptions>,
  ): Promise<RefundDetails>;
  async createRefund(
    outRefundNoOrOptions: string | CreateRefundOptions,
    refundAmount?: number,
    totalAmount?: number,
    options?: Partial<CreateRefundOptions>,
  ) {
    if ('string' !== typeof outRefundNoOrOptions) {
      options = outRefundNoOrOptions;
    } else {
      options = merge(
        {
          out_refund_no: outRefundNoOrOptions,
          amount: {
            refund: refundAmount,
            total: totalAmount,
            currency: 'CNY',
          },
        } as CreateRefundOptions,
        options,
      );
    }
    return await this._request<RefundDetails>(
      'POST',
      RefundUrl(),
      Object.assign(
        {
          appid: this._appId,
          mchid: this._mchId,
          notify_url: this._refundNotifyUrl,
        },
        options,
      ),
    );
  }

  async getRefund(outRefundNo: string) {
    return await this._request<RefundDetails>(
      'GET',
      QueryRefundUrl(outRefundNo),
    );
  }

  async getTradeBill(
    billDate: string,
    billType: BillType = 'ALL',
    tarType?: 'GZIP',
  ) {
    return await this._request<DownloadInfo>(
      'GET',
      TradeBillUrl(billDate, billType, tarType),
    );
  }

  async getFundFlowBill(
    billDate: string,
    accountType: AccountType = 'BASIC',
    tarType?: 'GZIP',
  ) {
    return await this._request<DownloadInfo>(
      'GET',
      FundFlowBillUrl(billDate, accountType, tarType),
    );
  }

  async downloadBill(downloadInfo: DownloadInfo) {
    return await this._request(
      'GET',
      downloadInfo.download_url,
      undefined,
      true,
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
