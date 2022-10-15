import {
  TradeType,
  TradeState,
  PromotionScope,
  PromotionType,
  Currency,
} from './common.interface';

export interface CreateTransactionOptions {
  description: string; // 商品描述
  out_trade_no: string; // 商户系统内部订单号
  notify_url?: string; // 通知地址
  // 订单金额
  amount: {
    total: number; // 总金额，单位为分
    currency?: Currency; // 货币类型，默认为CNY
  };
  // 支付者信息
  payer?: {
    openid: string; // 用户openid
  };
  // 场景信息
  scene_info?: {
    payer_client_ip: string; // 用户终端IP
    device_id?: string; // 商户端设备号
    // 商户门店信息
    store_info?: {
      id: string; // 门店编号
      name?: string; // 门店名称
      area_code?: string; // 地区编码
      address?: string; // 详细地址
    };
  };
  time_expire?: string; // 交易结束时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  attach?: string; // 附加数据
  goods_tag?: string; // 订单优惠标记
  // 优惠功能
  detail?: {
    cost_price?: number; // 订单原价
    invoice_id?: string; // 商家小票ID
    // 单品列表
    goods_detail?: {
      merchant_goods_id: string; // 商户侧商品编号
      wechatpay_goods_id?: string; // 微信侧商品编号
      goods_name?: string; // 商品名称
      quantity: number; // 商品数量
      unit_price: number; // 商品单价，单位为分
    }[];
  };
  // 结算信息
  settle_info?: {
    profit_sharing: boolean; // 是否指定分账
  };
}

export type CreateTransactionResult =
  | CreateJSAPITransactionResult
  | CreateAPPTransactionResult
  | CreateNativeTransactionResult;

export interface CreateJSAPITransactionResult {
  prepay_id: string; // 预支付交易会话标识
}

export interface CreateAPPTransactionResult {
  prepay_id: string; // 预支付交易会话标识
}

export interface CreateNativeTransactionResult {
  code_url: string; // 二维码链接
}

export interface TransactionDetails {
  appid: string; // 应用ID
  mchid: string; // 直连商户号
  out_trade_no: string; // 商户订单号
  transaction_id?: string; // 微信支付订单号
  trade_type?: TradeType; // 交易类型
  // 交易状态
  trade_state: TradeState;
  trade_state_desc: string; // 交易状态描述
  bank_type?: string; // 付款银行
  attach?: string; // 附加数据
  success_time?: string; // 支付完成时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  // 支付者
  payer: {
    openid: string; // 用户标识
  };
  // 订单金额
  amount?: {
    total?: number; // 订单总金额，单位为分
    payer_total?: number; // 用户支付金额，单位为分
    currency?: Currency; // 货币类型
    payer_currency?: Currency; // 用户支付币种
  };
  // 场景信息
  scene_info?: {
    device_id?: string; // 商户端设备号
  };
  // 优惠功能
  promotion_detail: {
    coupon_id: string; // 券ID
    name?: string; // 优惠名称
    scope?: PromotionScope;
    type?: PromotionType;
    amount: number; // 优惠券面额
    stock_id?: string; // 活动ID
    wechatpay_contribute?: number; // 微信出资，单位为分
    merchant_contribute?: number; // 商户出资，单位为分
    other_contribute?: number; // 其他出资，单位为分
    currency?: Currency; // 优惠币种
    // 单品列表
    goods_detail?: {
      goods_id: string; // 商品编码
      quantity: number; // 商品数量
      unit_price: number; // 商品单价，单位为分
      discount_amount: number; // 商品优惠金额
      goods_remark?: string; // 商品备注
    }[];
  }[];
}
