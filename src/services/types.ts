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

/** 订单生命周期：REFUNDED 为后端预留状态，暂无接口产生。 */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface CheckoutSessionResponse {
  readonly orderId: string;
  /** 支付渠道的托管结账页地址，前端直接跳转。 */
  readonly checkoutUrl: string;
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
