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

export interface LicenseSummary {
  readonly product: string;
  readonly edition: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly maxActivations: number;
  readonly activations: ReadonlyArray<Activation>;
}

export interface LicenseListResponse {
  readonly licenses: ReadonlyArray<LicenseSummary>;
}

/** 目录中可售的版本（隶属某个产品）。 */
export interface CatalogEdition {
  readonly code: string;
  readonly priceCents: number;
  readonly currency: string;
  readonly durationDays: number;
}

/**
 * 目录中的产品：展示性元数据（description/vendor/websiteUrl/iconUrl/tags/
 * sortOrder）不参与授权判定，仅用于呈现。
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
  readonly editions: ReadonlyArray<CatalogEdition>;
}

export interface CatalogResponse {
  readonly products: ReadonlyArray<CatalogProduct>;
}

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
  | 'UnknownEdition'
  | 'EditionUnavailable'
  | 'SubscriptionAlreadyActive'
  | 'UnsupportedCurrency'
  | 'EditionNotPurchasable'
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
  readonly edition: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly createdAt: string;
  readonly paidAt: string | null;
}

export interface OrderListResponse {
  readonly orders: ReadonlyArray<OrderSummary>;
}
