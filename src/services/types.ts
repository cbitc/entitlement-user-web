/** 与后端 errorBody 一致的错误信封。 */
export interface ApiErrorBody {
  readonly error: {
    readonly type: string;
    readonly message: string;
  };
}

// -- identity ---------------------------------------------------------------

export interface RequestLoginResponse {
  readonly email: string;
  readonly expiresAt: string;
}

export interface VerifyLoginResponse {
  readonly token: string;
}

// -- licensing --------------------------------------------------------------

export interface Activation {
  readonly machineId: string;
  readonly activatedAt: string;
  readonly lastRefreshedAt: string;
}

/**
 * 许可证是订阅在 licensing 侧的事件投影，键为 (邮箱, 产品)：
 * 同一产品最多一条，`plan` 记录它当前授权的版本。
 */
export interface LicenseSummary {
  readonly product: string;
  readonly plan: string;
  /** 试用授权为 true；转正后为 false。 */
  readonly trial: boolean;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly maxActivations: number;
  readonly activations: ReadonlyArray<Activation>;
}

export interface LicenseListResponse {
  readonly licenses: ReadonlyArray<LicenseSummary>;
}

// -- subscription catalogue -------------------------------------------------

/** 计费周期；后端按 30 / 365 天折算一次购买覆盖的时长。 */
export type PlanInterval = 'MONTH' | 'YEAR';

/** 版本在某个计费周期上的报价；下单时会快照进订单与订阅项。 */
export interface PlanPrice {
  readonly interval: PlanInterval;
  readonly priceCents: number;
  readonly currency: string;
}

/** 版本级试用策略：试用与计费周期无关，转正时才选择周期。 */
export interface PlanTrial {
  readonly days: number;
  readonly maxActivations: number;
}

/**
 * 目录中的版本（edition）。同一版本可按月/按年出售，周期只决定一次购买
 * 覆盖的时长，不改变版本本身；报价在 `prices` 上，试用策略在 `trial` 上。
 */
export interface CatalogPlan {
  readonly code: string;
  /** 不提供试用时为 null。 */
  readonly trial: PlanTrial | null;
  readonly prices: ReadonlyArray<PlanPrice>;
}

/**
 * 目录中的产品：描述性元数据（description/vendor/websiteUrl/iconUrl/tags/
 * sortOrder）不参与授权判定，仅用于呈现；版本与定价全部在 `plans` 上。
 */
export interface CatalogProduct {
  readonly code: string;
  readonly displayName: string;
  readonly description: string | null;
  readonly vendor: string | null;
  readonly websiteUrl: string | null;
  readonly iconUrl: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly sortOrder: number;
  readonly plans: ReadonlyArray<CatalogPlan>;
}

export interface CatalogResponse {
  readonly products: ReadonlyArray<CatalogProduct>;
}

// -- subscriptions ----------------------------------------------------------

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'FROZEN'
  | 'EXPIRED';

interface SubscriptionItemBase {
  readonly product: string;
  readonly plan: string;
  readonly quantity: number;
  readonly maxActivations: number;
}

/** 试用项是版本的限时变体：没有计费周期，也没有价格。 */
export interface TrialSubscriptionItem extends SubscriptionItemBase {
  readonly kind: 'TRIAL';
  readonly interval: null;
  readonly unitPriceCents: null;
  readonly currency: null;
}

/** 付费项快照了实际售出的周期与价格；目录改价不会影响已有合同。 */
export interface PaidSubscriptionItem extends SubscriptionItemBase {
  readonly kind: 'PAID';
  readonly interval: PlanInterval;
  readonly unitPriceCents: number;
  readonly currency: string;
}

export type SubscriptionItem = TrialSubscriptionItem | PaidSubscriptionItem;

/**
 * 一份商业合同：只覆盖一个产品的一个版本（试用或付费）。
 *
 * 未支付的结账不会创建订阅：待支付状态只存在于订单上。
 */
export interface SubscriptionSummary {
  readonly id: string;
  readonly status: SubscriptionStatus;
  /** 合同当前是否为试用变体；转正后为 false。 */
  readonly trial: boolean;
  readonly periodStart: string;
  readonly periodEnd: string;
  /** 试用截止时间；非试用订阅为 null。 */
  readonly trialEnd: string | null;
  readonly createdAt: string;
  readonly items: ReadonlyArray<SubscriptionItem>;
}

export interface SubscriptionListResponse {
  readonly subscriptions: ReadonlyArray<SubscriptionSummary>;
}

export interface TrialResponse {
  readonly subscriptionId: string;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: string | null;
  /** 试用期允许激活的设备数。 */
  readonly trialMaxActivations: number;
}

/**
 * 试用失败的错误类型，与后端 subscription 的试用用例一致。
 * `TrialAlreadyUsed` 表示该产品已用过一次终身试用。
 */
export type TrialErrorType =
  | 'UnknownPlan'
  | 'PlanUnavailable'
  | 'TrialNotAvailable'
  | 'TrialAlreadyUsed'
  | 'SubscriptionAlreadyActive';

// -- billing ----------------------------------------------------------------

/**
 * 订单生命周期，与后端 `OrderStatus` 一致。
 *
 * 终态有三种：`PAID` 已支付；`EXPIRED` 是废弃的结账（支付宝在
 * timeout_express 后关闭了未付款交易）；`FAILED` 是卖不出去的结账
 * （网关拒绝或回调金额不符）。
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

/**
 * 下单失败的错误类型，与后端 `CreateCheckoutErrorType` 一一对应。
 * 已有订阅不会阻止购买：支付确认时会续费或切换版本。
 */
export type CheckoutErrorType =
  | 'UnknownPlan'
  | 'PlanUnavailable'
  | 'PlanIntervalUnavailable'
  | 'UnsupportedCurrency'
  | 'PlanNotPurchasable'
  | 'PaymentGatewayError';

/** 下单结果：订单号与支付宝电脑网站支付的收银台地址。 */
export interface CheckoutResponse {
  readonly orderId: string;
  /**
   * 支付宝收银台地址（`alipay.trade.page.pay` 生成的签名链接）。
   * 前端直接整页跳转过去，买家在支付宝页面完成付款。
   */
  readonly payUrl: string;
}

export interface OrderSummary {
  readonly orderId: string;
  readonly product: string;
  readonly plan: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly createdAt: string;
  /** 支付窗口截止时间；到点后收银台页面不再可支付。 */
  readonly expiresAt: string;
  readonly paidAt: string | null;
}

export interface OrderListResponse {
  readonly orders: ReadonlyArray<OrderSummary>;
}
