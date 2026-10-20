import { request } from './request';
import type {
  CatalogResponse,
  CheckoutResponse,
  LicenseListResponse,
  OrderListResponse,
  OrderSummary,
  PlanInterval,
  RequestLoginResponse,
  SubscriptionListResponse,
  TrialResponse,
  VerifyLoginResponse,
} from './types';

/** 请求邮箱登录验证码。 */
export const requestLogin = (email: string) =>
  request
    .post<RequestLoginResponse>('/auth/request-login', { email })
    .then((res) => res.data);

/** 校验验证码，换取会话 token。 */
export const verifyLogin = (email: string, code: string) =>
  request
    .post<VerifyLoginResponse>('/auth/verify-login', { email, code })
    .then((res) => res.data);

/** 当前用户的全部许可证（按产品唯一，含激活设备）。 */
export const listLicenses = () =>
  request.get<LicenseListResponse>('/licensing/licenses').then((res) => res.data);

/** 远程停用某台设备的激活（许可证按产品定位）。 */
export const deactivateDevice = (params: {
  product: string;
  machineId: string;
}) => request.post<void>('/licensing/licenses/deactivate', params).then(() => undefined);

/** 可售产品目录（产品 + 版本定价），归属 subscription 模块。 */
export const listCatalog = () =>
  request.get<CatalogResponse>('/subscription/catalog').then((res) => res.data);

/** 当前用户的全部订阅合同（最新在前）。 */
export const listSubscriptions = () =>
  request
    .get<SubscriptionListResponse>('/subscription/subscriptions')
    .then((res) => res.data);

/**
 * 开始试用：试用策略挂在版本上，与计费周期无关；不产生订单与支付，
 * 直接创建 TRIALING 订阅。已有开放订阅或已用过该产品的终身试用都会被拒绝。
 */
export const startTrial = (params: { product: string; plan: string }) =>
  request.post<TrialResponse>('/subscription/trials', params).then((res) => res.data);

/** 下单：创建订单并返回支付宝电脑网站支付的收银台地址。 */
export const createCheckout = (params: {
  product: string;
  plan: string;
  interval: PlanInterval;
}) =>
  request
    .post<CheckoutResponse>('/billing/checkout', params)
    .then((res) => res.data);

/**
 * 读取单笔订单，用于支付结果页轮询支付结果。
 *
 * 付款由支付宝异步通知后端、或后端对账轮询来确认，前端只能读到结果；
 * 这条路由只读后端自己的存储、不询问支付宝，因此轮询可以很频繁。
 */
export const getOrder = (orderId: string) =>
  request
    .get<OrderSummary>(`/billing/orders/${encodeURIComponent(orderId)}`)
    .then((res) => res.data);

/** 当前用户的订单记录（按创建时间倒序）。 */
export const listOrders = () =>
  request.get<OrderListResponse>('/billing/orders').then((res) => res.data);
