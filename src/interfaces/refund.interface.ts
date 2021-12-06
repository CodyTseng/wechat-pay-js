import {
  Currency,
  RefundChannel,
  FundsAccount,
  PromotionScope,
  PromotionType,
  RefundFromAccount,
  RefundStatus,
} from './common.interface';

export interface CreateRefundOptions {
  transaction_id?: string; // 微信支付订单号
  out_trade_no?: string; // 商户订单号
  out_refund_no: string; // 商户退款单号
  reason?: string; // 退款原因
  notify_url?: string; // 退款结果回掉url
  funds_account?: 'AVAILABLE'; // 若传递此参数则使用对应的资金账户退款，否则默认使用未结算资金退款（仅对老资金流商户适用）。枚举值：AVAILABLE：可用余额账户
  // 金额信息
  amount: {
    refund: number; // 退款金额，单位为分
    // 退款出资账户及金额
    from?: {
      account: RefundFromAccount;
      amount: number; // 对应账户出资金额
    }[];
    total: number; // 原订单金额
    currency: Currency; // 退款币种，目前仅支持人民币：CNY
  };
  // 退款商品
  goods_detail?: {
    merchant_goods_id: string; // 商户侧商品编码
    wechatpay_goods_id?: string; // 微信侧商品编码
    goods_name?: string; // 商品名称
    unit_price: number; // 商品单价金额，单位为分
    refund_amount: number; // 商品退款金额，单位为分
    refund_quantity: number; // 退款数量
  }[];
}

export interface RefundDetails {
  refund_id: string; // 微信支付退款单号
  out_refund_no: string; // 商户退款单号
  transaction_id: string; // 微信支付交易订单号
  out_trade_no: string; // 商户订单号
  // 退款渠道
  channel: RefundChannel;
  user_received_account: string; // 退款入账账户
  success_time?: string; // 退款成功时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  create_time: string; // 退款创建时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  status: RefundStatus;
  funds_account?: FundsAccount;
  // 金额信息
  amount: {
    total: number; // 订单金额，单位为分
    refund: number; // 退款金额，单位为分
    // 退款出资账户及金额
    from?: {
      account: RefundFromAccount;
      amount: number; // 对应账户出资金额，单位为分
    }[];
    payer_total: number; // 用户支付金额，单位为分
    payer_refund: number; // 用户退款金额，单位为分
    settlement_refund: number; // 应结退款金额，单位为分
    settlement_total: number; // 应结订单金额，单位为分
    discount_refund: number; // 优惠退款金额，单位为分
    currency: Currency; // 退款币种，目前只支持人民币：CNY
  };
  // 优惠退款信息
  promotion_detail?: {
    promotion_id: string; // 券ID
    scope: PromotionScope;
    type: PromotionType;
    amount: number; // 优惠券面额
    refund_amount: number; // 优惠退款金额，单位为分
    // 单品列表
    goods_detail?: {
      merchant_goods_id: string; // 商户侧商品编码
      wechatpay_goods_id?: string; // 微信侧商品编码
      goods_name?: string; // 商品名称
      unit_price: number; // 商品单价，单位为分
      refund_amount: number; // 商品退款金额，单位为分
      refund_quantity: number; // 商品数量
    }[];
  }[];
}
