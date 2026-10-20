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
 * 同一产品最多一条，`plan` 记录它当前授权的套餐。
 */
export interface LicenseSummary {
  readonly product: string;
  readonly plan: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly maxActivations: number;
  readonly activations: ReadonlyArray<Activation>;
}

export interface LicenseListResponse {
  readonly licenses: ReadonlyArray<LicenseSummary>;
}

// -- subscription catalogue -------------------------------------------------

/** 套餐的计费周期；后端按 30 / 365 天折算授权时长。 */
export type PlanInterval = 'MONTH' | 'YEAR';

/** 产品下的一项定价选择；订阅时会快照进订阅项。 */
export interface CatalogPlan {
  readonly code: string;
  readonly interval: PlanInterval;
  readonly priceCents: number;
  readonly currency: string;
  readonly trialDays: number;
}

/**
 * 目录中的产品：描述性元数据（description/vendor/websiteUrl/iconUrl/tags/
 * sortOrder）不参与授权判定，仅用于呈现；定价全部在 `plans` 上。
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
  | 'INCOMPLETE'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

/** 订阅中的一项：合同快照，目录改价不会影响已有合同。 */
export interface SubscriptionItem {
  readonly product: string;
  readonly plan: string;
  readonly interval: PlanInterval;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly currency: string;
  readonly maxActivations: number;
}

/**
 * 一份商业合同。一个订阅可包含多个产品项（管理员可创建），
 * 但同一产品的月付/年付互为替代，不会同时出现。
 */
export interface SubscriptionSummary {
  readonly id: string;
  readonly status: SubscriptionStatus;
  readonly periodStart: string;
  readonly periodEnd: string;
  /** 试用截止时间；非试用订阅为 null。 */
  readonly trialEnd: string | null;
  /** 已申请期末取消：当前周期内仍可使用。 */
  readonly cancelAtPeriodEnd: boolean;
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
}

/** 试用失败的错误类型，与后端 subscription 的试用用例一致。 */
export type TrialErrorType =
  | 'UnknownPlan'
  | 'PlanUnavailable'
  | 'TrialNotAvailable'
  | 'SubscriptionAlreadyActive';

/** 取消订阅失败的错误类型。 */
export type CancelErrorType = 'NotFound' | 'InvalidTransition';

// -- billing ----------------------------------------------------------------

/**
 * 订单生命周期，与后端 `OrderStatus` 一致。
 *
 * 终态有三种：`PAID` 已支付；`EXPIRED` 是废弃的结账（支付宝在
 * timeout_express 后关闭了未付款交易）；`FAILED` 是卖不出去的结账
 * （网关拒绝、回调金额不符，或支付期间订阅被抢占）。
 */
export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

/** 下单失败的错误类型，与后端 `CreateCheckoutErrorType` 一一对应。 */
export type CheckoutErrorType =
  | 'UnknownPlan'
  | 'PlanUnavailable'
  | 'SubscriptionAlreadyActive'
  | 'UnsupportedCurrency'
  | 'PlanNotPurchasable'
  | 'PaymentGatewayError';

/** 下单结果：订单号与二维码内容（支付宝当面付预下单，买家扫码付款）。 */
export interface CheckoutResponse {
  readonly orderId: string;
  /**
   * 二维码内容（支付宝返回的 `https://qr.alipay.com/...`），
   * 由前端本地渲染成二维码，不做任何跳转。
   */
  readonly qrCode: string;
}

export interface OrderSummary {
  readonly orderId: string;
  readonly product: string;
  readonly plan: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly createdAt: string;
  /** 支付窗口截止时间；到点后二维码不再可用。 */
  readonly expiresAt: string;
  readonly paidAt: string | null;
}

export interface OrderListResponse {
  readonly orders: ReadonlyArray<OrderSummary>;
}
