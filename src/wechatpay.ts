import * as crypto from 'crypto';
import * as fs from 'fs';
import * as urllib from 'urllib';
import {
  buildPaySignMessage,
  buildRequestMessage,
  buildVerifyMessage,
  buildToken,
  generateNonce,
  sign,
  verify,
} from './utils';
import {
  CertificatesUrl,
  CloseTransactionUrl,
  CreateCombineTransactionUrl,
  CreateTransactionUrl,
  FundFlowBillUrl,
  QueryCombineTransactionUrl,
  QueryRefundUrl,
  QueryTransactionByOutTradeNoUrl,
  QueryTransactionUrl,
  RefundUrl,
  TradeBillUrl,
} from './urls';
import {
  AccountType,
  AppIdType,
  BillType,
  CreateTransactionOptions,
  CreateTransactionResult,
  TransactionDetails,
  CreateRefundOptions,
  RefundDetails,
  WechatpayOptions,
  Certificate,
  TradeBillResult,
  FundFlowBillResult,
  GenerateNonceFunc,
  CloseCombineTransactionOptions,
  CombineTransactionDetails,
  CreateCombineTransactionResult,
  CreateCombineTrasactionOptions,
  FailResult,
  QueryCertificatesResult,
  SuccessResult,
} from './interfaces';
import { WechatpayError } from './error';

export class Wechatpay {
  private _appId: string;
  private _mchId: string;
  private _apiV3Key: string;
  private _privateKey: Buffer;
  private _serialNo: string;
  private _appIdType: AppIdType;
  private _certs: Certificate[];
  private _needVerify: boolean;
  private _nonceLength: number;
  private _generateNonceFunc: GenerateNonceFunc;

  constructor(options: WechatpayOptions) {
    this._appId = options.appId;
    this._mchId = options.mchId;
    this._apiV3Key = options.apiV3Key;
    this._privateKey = fs.readFileSync(options.privateKeyPath);
    this._serialNo = options.serialNo;
    this._appIdType = options.appIdType;
    this._certs = [];
    this._needVerify = options.needVerify || true;
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

  get appIdType() {
    return this._appIdType;
  }

  get certs() {
    return this._certs;
  }

  async request<T = undefined>(
    method: urllib.HttpMethod,
    url: string,
    body?: any,
  ) {
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
      throw new WechatpayError('http request failed');
    }

    if (result.status !== 200 && result.status !== 204) {
      const { code, message, detail } = JSON.parse(result.data);
      return this._fail(message, code, result.status, detail);
    }

    if (result.headers['content-type'].split(';')[0] !== 'application/json') {
      return this._success<T>(result.data);
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
        throw new WechatpayError('cert not found');
      }
      const verifyResult = verify(
        cert.certificate,
        message,
        result.headers['wechatpay-signature'],
      );
      if (!verifyResult) {
        return this._fail('微信返回结果签名验证失败', 'VERIFY_FAIL', 500);
      }
    }

    return this._success<T>(result.data.length ? JSON.parse(result.data) : {});
  }

  async updateCerts() {
    const res = await this.request<QueryCertificatesResult>(
      'GET',
      CertificatesUrl(),
    );
    if (!res.isSuccess) {
      throw new WechatpayError('update certs fail');
    }

    this._certs = [];
    for (const item of res.data.data) {
      const { encrypt_certificate, ...info } = item;
      const certificate = this.decipher(
        encrypt_certificate.ciphertext,
        encrypt_certificate.associated_data,
        encrypt_certificate.nonce,
      );
      this._certs.push(Object.assign(info, { certificate }));
    }
  }

  async createTransaction(options: CreateTransactionOptions) {
    if (this._appIdType === 'JSAPI' && !options.payer?.openid) {
      throw new WechatpayError(
        'create jsapi transaction need options.payer.openid',
      );
    }

    return await this.request<CreateTransactionResult>(
      'POST',
      CreateTransactionUrl(this._appIdType),
      Object.assign(options, {
        appid: this._appId,
        mchid: this._mchId,
      }),
    );
  }

  async createCombineTransaction(options: CreateCombineTrasactionOptions) {
    if (this._appIdType === 'JSAPI' && !options.combine_payer_info?.openid) {
      throw new WechatpayError(
        'create jsapi transaction need options.combine_payer_info.openid',
      );
    }

    return await this.request<CreateCombineTransactionResult>(
      'POST',
      CreateCombineTransactionUrl(this._appIdType),
      Object.assign(options, {
        combine_appid: this._appId,
        combine_mchid: this.mchId,
      }),
    );
  }

  async queryTransaction(id: string) {
    return await this.request<TransactionDetails>(
      'GET',
      QueryTransactionUrl(id, this._mchId),
    );
  }

  async queryTransactionByOutTradeNo(outTradeNo: string) {
    return await this.request<TransactionDetails>(
      'GET',
      QueryTransactionByOutTradeNoUrl(outTradeNo, this._mchId),
    );
  }

  async queryCombineTransaction(combineOutTradeNo: string) {
    return await this.request<CombineTransactionDetails>(
      'GET',
      QueryCombineTransactionUrl(combineOutTradeNo),
    );
  }

  async closeTransaction(outTradeNo: string) {
    return await this.request('POST', CloseTransactionUrl(outTradeNo), {
      mchid: this._mchId,
    });
  }

  async closeCombineTransaction(
    combineOutTradeNo: string,
    options: CloseCombineTransactionOptions,
  ) {
    return await this.request(
      'POST',
      CloseTransactionUrl(combineOutTradeNo),
      Object.assign(options, {
        combine_appid: this._appId,
      }),
    );
  }

  async createRefund(options: CreateRefundOptions) {
    if (!options.out_refund_no && !options.transaction_id) {
      throw new WechatpayError('missing out_trade_no or transaction_id');
    }

    return await this.request<RefundDetails>('POST', RefundUrl(), options);
  }

  async queryRefund(outRefundNo: string) {
    return await this.request<RefundDetails>(
      'GET',
      QueryRefundUrl(outRefundNo),
    );
  }

  async tradeBill(
    billDate: string,
    billType: BillType = 'ALL',
    tarType?: 'GZIP',
  ) {
    return await this.request<TradeBillResult>(
      'GET',
      TradeBillUrl(billDate, billType, tarType),
    );
  }

  async fundFlowBill(
    billDate: string,
    accountType: AccountType = 'BASIC',
    tarType?: 'GZIP',
  ) {
    return await this.request<FundFlowBillResult>(
      'GET',
      FundFlowBillUrl(billDate, accountType, tarType),
    );
  }

  async download(downloadUrl: string) {
    return await this.request<Buffer>('GET', downloadUrl);
  }

  getPaySign(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = this._generateNonceFunc(this._nonceLength);
    const message = buildPaySignMessage(
      this._appId,
      timestamp,
      nonceStr,
      prepayId,
      this._appIdType,
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

  decipher(ciphertext: string, associatedData: string, nonceStr: string) {
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

  private _success<T>(data: T): SuccessResult<T> {
    return {
      isSuccess: true,
      data,
    };
  }

  private _fail(
    message: string,
    code: string,
    status: number,
    detail?: any,
  ): FailResult {
    return {
      isSuccess: false,
      message,
      code,
      status,
      detail,
    };
  }
}
