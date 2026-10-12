import { request } from './request';
import type {
  CatalogResponse,
  CheckoutResponse,
  LicenseListResponse,
  OrderListResponse,
  OrderSummary,
  RequestLoginResponse,
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

/** 当前用户的全部许可证（含激活设备）。 */
export const listLicenses = () =>
  request.get<LicenseListResponse>('/licensing/licenses').then((res) => res.data);

/** 远程停用某台设备的激活。 */
export const deactivateDevice = (params: {
  product: string;
  edition: string;
  machineId: string;
}) => request.post<void>('/licensing/licenses/deactivate', params).then(() => undefined);

/** 产品目录（可订阅的产品/版本，含定价）。 */
export const listCatalog = () =>
  request.get<CatalogResponse>('/licensing/catalog').then((res) => res.data);

/** 创建订单，返回支付宝收银台地址（前端直接跳转）。 */
export const createCheckout = (params: { product: string; edition: string }) =>
  request
    .post<CheckoutResponse>('/billing/checkout', params)
    .then((res) => res.data);

/**
 * 主动询问渠道「这笔订单付款了吗」，返回订单当前状态。
 *
 * 支付宝的异步通知可能晚于浏览器回跳，成功页用它立即确认结果；
 * 订单已不是 PENDING 时后端只读存储，不打扰渠道，因此可安全轮询。
 */
export const checkOrderPayment = (orderId: string) =>
  request
    .post<OrderSummary>(
      `/billing/orders/${encodeURIComponent(orderId)}/payment-check`,
    )
    .then((res) => res.data);

/** 当前用户的订单记录（按创建时间倒序）。 */
export const listOrders = () =>
  request.get<OrderListResponse>('/billing/orders').then((res) => res.data);
