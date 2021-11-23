export type TradeType = 'JSAPI' | 'APP' | 'NATIVE';

export type GenerateNonceFunc = (length: number) => string;

export type WechatPayOptions = {
  appId: string;
  mchId: string;
  apiV3Key: string;
  privateKeyPath: string;
  serialNo: string;
  tradeType: TradeType;
  needVerify?: boolean;
  nonceLength?: number;
  generateNonceFunc?: GenerateNonceFunc;
};

export interface WechatPayCert {
  effective_time: string;
  certificate: string;
  expire_time: string;
  serial_no: string;
}

export type CreateTransactionOptions = {
  description: string; // 商品描述
  out_trade_no: string; // 商户系统内部订单号
  notify_url: string; // 通知地址
  // 订单金额
  amount: {
    total: number; // 总金额，单位为分
    currency?: string; // 货币类型，默认为CNY
  };
  // 支付者信息
  payer?: {
    openid: string; // 用户openid
  };
  // 场景信息
  scene_info: {
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
};

export type CreateRefundOptions = {
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
      account: 'AVAILABLE' | 'UNAVAILABLE'; // 出资类型
      amount: number; // 对应账户出资金额
    }[];
    total: number; // 原订单金额
    currency: 'CNY'; // 退款币种，目前仅支持人民币：CNY
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
};

export type CreateTransactionResult =
  | CreateTransactionJsapiResult
  | CreateTransactionAppResult
  | CreateTransactionNativeResult;

export type CreateTransactionJsapiResult = {
  prepay_id: string; // 预支付交易会话标识
};

export type CreateTransactionAppResult = {
  prepay_id: string; // 预支付交易会话标识
};

export type CreateTransactionNativeResult = {
  code_url: string; // 二维码链接
};

export type TransactionDetails = {
  appid: string; // 应用ID
  mchid: string; // 直连商户号
  out_trade_no: string; // 商户订单号
  transaction_id?: string; // 微信支付订单号
  trade_type?: TradeType; // 交易类型
  // 交易状态
  trade_state:
    | 'SUCCESS'
    | 'REFUND'
    | 'NOTPAY'
    | 'CLOSED'
    | 'REVOKED'
    | 'USERPAYING'
    | 'PAYERROR';
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
    currency?: string; // 货币类型
    payer_currency?: string; // 用户支付币种
  };
  // 场景信息
  scene_info?: {
    device_id?: string; // 商户端设备号
  };
  // 优惠功能
  promotion_detail: {
    coupon_id: string; // 券ID
    name?: string; // 优惠名称
    scope?: 'GLOBAL' | 'SINGLE'; // GLOBAL：全场代金券; SINGLE：单品优惠
    type?: 'CASH' | 'NOCASH'; // CASH：充值; NOCASH：预充值
    amount: number; // 优惠券面额
    stock_id?: string; // 活动ID
    wechatpay_contribute?: number; // 微信出资，单位为分
    merchant_contribute?: number; // 商户出资，单位为分
    other_contribute?: number; // 其他出资，单位为分
    currency?: string; // 优惠币种
    // 单品列表
    goods_detail?: {
      goods_id: string; // 商品编码
      quantity: number; // 商品数量
      unit_price: number; // 商品单价，单位为分
      discount_amount: number; // 商品优惠金额
      goods_remark?: string; // 商品备注
    }[];
  }[];
};

export type RefundDetails = {
  refund_id: string; // 微信支付退款单号
  out_refund_no: string; // 商户退款单号
  transaction_id: string; // 微信支付交易订单号
  out_trade_no: string; // 商户订单号
  // 退款渠道
  channel: 'ORIGINAL' | 'BALANCE' | 'OTHER_BALANCE' | 'OTHER_BANKCARD';
  user_received_account: string; // 退款入账账户
  success_time?: string; // 退款成功时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  create_time: string; // 退款创建时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  status: 'SUCCESS' | 'CLOSED' | 'PROCESSING' | 'ABNORMAL';
  funds_account?:
    | 'UNSETTLED'
    | 'AVAILABLE'
    | 'UNAVAILABLE'
    | 'OPERATION'
    | 'BASIC';
  // 金额信息
  amount: {
    total: number; // 订单金额，单位为分
    refund: number; // 退款金额，单位为分
    // 退款出资账户及金额
    from?: {
      account: 'AVAILABLE' | 'UNAVAILABLE'; // 出资类型
      amount: number; // 对应账户出资金额，单位为分
    }[];
    payer_total: number; // 用户支付金额，单位为分
    payer_refund: number; // 用户退款金额，单位为分
    settlement_refund: number; // 应结退款金额，单位为分
    settlement_total: number; // 应结订单金额，单位为分
    discount_refund: number; // 优惠退款金额，单位为分
    currency: 'CNY'; // 退款币种，目前只支持人民币：CNY
  };
  // 优惠退款信息
  promotion_detail?: {
    promotion_id: string; // 券ID
    scope: 'GLOBAL' | 'SINGLE'; // GLOBAL：全场代金券; SINGLE：单品优惠
    type: 'COUPON' | 'DISCOUNT'; // COUPON：代金券，需要走结算资金的充值型代金券; DISCOUNT：优惠券，不走结算资金的免充值型优惠券
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
};

export type TradeBillResult = {
  hash_type: string; // 哈希类型
  hash_value: string; // 哈希值
  download_url: string; // 下载地址
};

export type FundFlowBillResult = {
  hash_type: string; // 哈希类型
  hash_value: string; // 哈希值
  download_url: string; // 下载地址
};

export type TransactionNotifyResource = {
  appid: string; // 应用ID
  mchid: string; // 直连商户号
  out_trade_no: string; // 商户订单号
  transaction_id: string; // 微信支付订单号
  trade_type: TradeType; // 交易类型
  // 交易状态
  trade_state:
    | 'SUCCESS'
    | 'REFUND'
    | 'NOTPAY'
    | 'CLOSED'
    | 'REVOKED'
    | 'USERPAYING'
    | 'PAYERROR';
  trade_state_desc: string; // 交易状态描述
  bank_type: string; // 付款银行
  attach?: string; // 附加数据
  success_time: string; // 支付完成时间，格式为YYYY-MM-DDTHH:mm:ss+TIMEZONE
  // 支付者
  payer: {
    openid: string; // 用户标识
  };
  // 订单金额
  amount: {
    total: number; // 订单总金额，单位为分
    payer_total: number; // 用户支付金额，单位为分
    currency: string; // 货币类型
    payer_currency: string; // 用户支付币种
  };
  // 场景信息
  scene_info?: {
    device_id?: string; // 商户端设备号
  };
  // 优惠功能
  promotion_detail?: {
    coupon_id: string; // 券ID
    name?: string; // 优惠名称
    scope?: 'GLOBAL' | 'SINGLE'; // GLOBAL：全场代金券; SINGLE：单品优惠
    type?: 'CASH' | 'NOCASH'; // CASH：充值; NOCASH：预充值
    amount: number; // 优惠券面额
    stock_id?: string; // 活动ID
    wechatpay_contribute?: number; // 微信出资，单位为分
    merchant_contribute?: number; // 商户出资，单位为分
    other_contribute?: number; // 其他出资，单位为分
    currency?: string; // 优惠币种
    // 单品列表
    goods_detail?: {
      goods_id: string; // 商品编码
      quantity: number; // 商品数量
      unit_price: number; // 商品单价，单位为分
      discount_amount: number; // 商品优惠金额
      goods_remark?: string; // 商品备注
    }[];
  }[];
};
