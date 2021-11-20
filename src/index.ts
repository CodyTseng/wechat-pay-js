import * as crypto from 'crypto';
import * as fs from 'fs';
import * as urllib from 'urllib';
import { deepMerge, generateNonce, sign, verify } from './utils';
import {
  CreateTransactionOptions,
  TransactionPrepayDetails,
  TransactionDetails,
  RefundOptions,
  RefundDetails,
  TradeType,
  WechatPayCert,
  WechatPayOptions,
  TradeBillResult,
  FundFlowBillResult,
} from './interface';
import { WechatPayError } from './error';
import {
  CertificatesUrl,
  CloseTransactionUrl,
  FundFlowBillUrl,
  QueryRefundUrl,
  QueryTransactionByOutTradeNoUrl,
  QueryTransactionUrl,
  RefundUrl,
  TradeBillUrl,
  TransactionsUrl,
} from './urls';

export class WechatPay {
  private _appId: string;
  private _mchId: string;
  private _apiV3Key: string;
  private _privateKey: Buffer;
  private _serialNo: string;
  private _tradeType: TradeType;
  private _certs: WechatPayCert[];
  private _needVerify: boolean;

  constructor(options: WechatPayOptions) {
    this._appId = options.appId;
    this._mchId = options.mchId;
    this._apiV3Key = options.apiV3Key;
    this._privateKey = fs.readFileSync(options.privateKeyPath);
    this._serialNo = options.serialNo;
    this._tradeType = options.tradeType;
    this._needVerify = options.needVerify || false;
    this._certs = [];
  }

  getAppId() {
    return this._appId;
  }

  getMchId() {
    return this._mchId;
  }

  getTradeType() {
    return this._tradeType;
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
    const res = await this._request('GET', CertificatesUrl());

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
  ): Promise<TransactionPrepayDetails> {
    if (this._tradeType === 'JSAPI' && !options?.payer?.openid) {
      throw new WechatPayError('JSAPI need openid');
    }

    return await this._request(
      'POST',
      TransactionsUrl(this._tradeType),
      deepMerge(options, {
        appid: this._appId,
        mchid: this._mchId,
      }),
    );
  }

  async queryTransaction(id: string): Promise<TransactionDetails> {
    return await this._request('GET', QueryTransactionUrl(id, this._mchId));
  }

  async queryTransactionByOutTradeNo(
    outTradeNo: string,
  ): Promise<TransactionDetails> {
    return await this._request(
      'GET',
      QueryTransactionByOutTradeNoUrl(outTradeNo, this._mchId),
    );
  }

  async closeTransaction(outTradeNo: string): Promise<void> {
    await this._request('POST', CloseTransactionUrl(outTradeNo), {
      mchid: this._mchId,
    });
  }

  async refund(options: RefundOptions) {
    if (!options.out_refund_no && !options.transaction_id) {
      throw new WechatPayError('missing out_trade_no or transaction_id');
    }

    return await this._request('POST', RefundUrl(), options);
  }

  async queryRefund(outRefundNo: string): Promise<RefundDetails> {
    return await this._request('GET', QueryRefundUrl(outRefundNo));
  }

  async tradeBill(
    billDate: string,
    billType: 'ALL' | 'SUCCESS' | 'REFUND' = 'ALL',
    tarType?: 'GZIP',
  ): Promise<TradeBillResult> {
    return await this._request(
      'GET',
      TradeBillUrl(billDate, billType, tarType),
    );
  }

  async fundFlowBill(
    billDate: string,
    accountType: 'BASIC' | 'OPERATION' | 'FEES' = 'BASIC',
    tarType?: 'GZIP',
  ): Promise<FundFlowBillResult> {
    return await this._request(
      'GET',
      FundFlowBillUrl(billDate, accountType, tarType),
    );
  }

  async download(downloadUrl: string) {
    return await this._request('GET', downloadUrl);
  }

  paySignJsapi(prepayId: string, timestamp: number, nonce: string) {
    return sign(
      this._privateKey,
      `${this._appId}\n${timestamp}\n${nonce}\nprepay_id=${prepayId}\n`,
    );
  }

  paySignApp(prepayId: string, timestamp: number, nonce: string) {
    return sign(
      this._privateKey,
      `${this._appId}\n${timestamp}\n${nonce}\n${prepayId}\n`,
    );
  }

  private async _request(
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
      if (this._needVerify && url !== CertificatesUrl()) {
        const message = this._buildVerifyMessage(
          result.headers['wechatpay-timestamp'],
          result.headers['wechatpay-nonce'],
          result.data.toString(),
        );
        if (this._certs.length === 0) {
          await this.updateCerts();
        }
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

    return result.data.length ? JSON.parse(result.data) : undefined;
  }

  private _getToken(method: urllib.HttpMethod, url: string, bodyStr: string) {
    const nonceStr = generateNonce();
    const timestamp = Math.floor(Date.now() / 1000);
    const message = this._buildMessage(
      method,
      url,
      timestamp,
      nonceStr,
      bodyStr,
    );
    const signature = sign(this._privateKey, message);

    return `mchid="${this._mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this._serialNo}",signature="${signature}"`;
  }

  private _buildMessage(
    method: urllib.HttpMethod,
    url: string,
    timestamp: number,
    nonceStr: string,
    bodyStr: string,
  ) {
    const _url = new URL(url);
    let canonicalUrl = _url.pathname;
    if (_url.search) {
      canonicalUrl += _url.search;
    }

    return `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
  }

  private _buildVerifyMessage(
    timestamp: number,
    nonceStr: string,
    bodyStr: string,
  ) {
    return `${timestamp}\n${nonceStr}\n${bodyStr}\n`;
  }
}
