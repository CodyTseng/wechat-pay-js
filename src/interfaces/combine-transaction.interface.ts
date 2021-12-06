import {
  TradeType,
  TradeState,
  PromotionScope,
  PromotionType,
  Currency,
} from './common.interface';

export interface CreateCombineTrasactionOptions {
  combine_out_trade_no: string; // 合单支付总订单号
  // 场景信息
  scene_info: {
    payer_client_ip: string; // 用户终端IP
    device_id?: string; // 商户端设备号
  };
  // 子单信息
  sub_orders: {
    mchid: string; // 子单发起方商户号即合单参与方商户号
    attach: string; // 附加信息
    // 订单金额
    amount: {
      total_amount: number; // 总金额，单位为分
      currency: Currency; // 货币类型，默认为CNY
    };
    out_trade_no: string; // 子商户订单号
    goods_tag?: string; // 订单优惠标记
    description: string; // 商品描述
    // 结算信息
    settle_info?: {
      profit_sharing?: boolean; // 是否指定分账
      subsidy_amount?: number; // 补差金额
    };
  }[];
  // 支付者信息
  combine_payer_info?: {
    openid?: string;
  };
  time_start?: string; // 交易起始时间
  time_expire?: string; // 交易结束时间
  notify_url: string; // 回调地址
}

export type CreateCombineTransactionResult =
  | CreateCombineTransactionJsapiResult
  | CreateCombineTransactionAppResult
  | CreateCombineTransactionNativeResult;

export interface CreateCombineTransactionJsapiResult {
  prepay_id: string; // 预支付交易会话标识
}

export interface CreateCombineTransactionAppResult {
  prepay_id: string; // 预支付交易会话标识
}

export interface CreateCombineTransactionNativeResult {
  code_url: string; // 二维码链接
}

export interface CombineTransactionDetails {
  combine_appid: string; // 合单商户appid
  combine_mchid: string; // 合单商户号
  combine_out_trade_no: string; // 合单商户订单号
  // 场景信息
  scene_info?: {
    device_id?: string; // 商户端设备ID
  };
  // 子单信息
  sub_orders: {
    mchid: string; // 子单商户号
    trade_type: TradeType; // 交易类型
    trade_state: TradeState;
    bank_type?: string; // 付款银行
    attach: string; // 附加数据
    success_time: string; // 订单支付时间
    transaction_id: string; // 微信订单号
    out_trade_no: string; // 子单商户订单号
    // 优惠功能
    promotion_detail?: {
      coupon_id: string; // 卷ID
      name?: string; // 优惠名称
      scope?: PromotionScope;
      type?: PromotionType;
      amount: number; // 优惠券金额
      stock_id?: string; // 活动ID
      wechatpay_contribute?: number; // 微信出资
      merchant_contribute?: number; // 商户出资
      other_contribute?: number; // 其他出资
      currency?: Currency; // 优惠币种
      goods_detail?: {
        goods_id: string; // 商品编号
        quantity: number; // 商品数量
        unit_price: number; // 商品价格
        discount_amount: number; // 商品优惠金额
        goods_remark?: string; // 商品备注
      }[];
    }[];
    amount: {
      total_amount: number; // 标价金额
      currency?: Currency; // 标价币种
      payer_amount: number; // 现金支付金额
      payer_currency?: Currency; // 现金支付币种
    };
  }[];
  // 支付者信息
  combine_payer_info?: {
    openid: string; // 用户标识符
  };
}

export interface CloseCombineTransactionOptions {
  // 子单信息
  sub_orders: {
    mchid: string; // 子单商户号
    out_trade_no: string; // 子单商户订单号
  }[];
}
