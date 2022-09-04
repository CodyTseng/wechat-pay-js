import { PaymentMethod } from './contants';

export const CertificatesUrl = () =>
  'https://api.mch.weixin.qq.com/v3/certificates';

export const CreateTransactionUrl = (paymentMethod: PaymentMethod) =>
  `https://api.mch.weixin.qq.com/v3/pay/transactions/${paymentMethod}`;

export const CreateCombineTransactionUrl = (paymentMethod: PaymentMethod) =>
  `https://api.mch.weixin.qq.com/v3/combine-transactions/${paymentMethod}`;

export const GetTransactionByTransactionIdUrl = (id: string, mchId: string) =>
  `https://api.mch.weixin.qq.com/v3/pay/transactions/id/${id}?mchid=${mchId}`;

export const QueryCombineTransactionUrl = (combineOutTradeNo: string) =>
  `https://api.mch.weixin.qq.com/v3/combine-transactions/out-trade-no/${combineOutTradeNo}`;

export const GetTransactionByOutTradeNoUrl = (
  outTradeNo: string,
  mchId: string,
) =>
  `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${mchId}`;

export const CloseTransactionUrl = (outTradeNo: string) =>
  `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;

export const CloseCombineTransactionUrl = (combineOutTradeNo: string) =>
  `https://api.mch.weixin.qq.com/v3/combine-transactions/out-trade-no/${combineOutTradeNo}/close`;

export const RefundUrl = () =>
  'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds';

export const QueryRefundUrl = (outRefundNo: string) =>
  `https://api.mch.weixin.qq.com/v3/refund/domestic/refunds/${outRefundNo}`;

export const TradeBillUrl = (
  billDate: string,
  billType: string,
  tarType?: 'GZIP',
) =>
  `https://api.mch.weixin.qq.com/v3/bill/tradebill?bill_date=${billDate}&bill_type=${billType}` +
  (tarType ? `&tar_type=${tarType}` : '');

export const FundFlowBillUrl = (
  billDate: string,
  accountType: string,
  tarType?: 'GZIP',
) =>
  `https://api.mch.weixin.qq.com/v3/bill/tradebill?bill_date=${billDate}&account_type=${accountType}` +
  (tarType ? `&tar_type=${tarType}` : '');
