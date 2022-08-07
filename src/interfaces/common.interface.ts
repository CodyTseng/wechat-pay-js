export type SuccessResult<T> = {
  isSuccess: true;
  data: T;
};

export type FailResult = {
  isSuccess: false;
  message: string;
  code: string;
  status: number;
  detail?: any;
};

export type TradeType =
  | 'JSAPI'
  | 'NATIVE'
  | 'APP'
  | 'MICROPAY'
  | 'MWEB'
  | 'FACEPAY';

export type TradeState =
  | 'SUCCESS'
  | 'REFUND'
  | 'NOTPAY'
  | 'CLOSED'
  | 'USERPAYING'
  | 'PAYERROR'
  | 'ACCEPT';

export type PromotionScope = 'GLOBAL' | 'SINGLE'; // GLOBAL：全场代金券; SINGLE：单品优惠

export type PromotionType = 'CASH' | 'NOCASH'; // CASH：充值; NOCASH：预充值

export type Currency = 'CNT';

export type RefundChannel =
  | 'ORIGINAL'
  | 'BALANCE'
  | 'OTHER_BALANCE'
  | 'OTHER_BANKCARD';

export type RefundStatus = 'SUCCESS' | 'CLOSED' | 'PROCESSING' | 'ABNORMAL';

export type FundsAccount =
  | 'UNSETTLED'
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'OPERATION'
  | 'BASIC';

export type RefundFromAccount = 'AVAILABLE' | 'UNAVAILABLE'; // 出资类型

export type AccountType = 'BASIC' | 'OPERATION' | 'FEES';

export type BillType = 'ALL' | 'SUCCESS' | 'REFUND';
