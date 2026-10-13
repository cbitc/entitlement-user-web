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

/** 下单：创建订单并向支付宝预下单，返回二维码内容。 */
export const createCheckout = (params: { product: string; edition: string }) =>
  request
    .post<CheckoutResponse>('/billing/checkout', params)
    .then((res) => res.data);

/**
 * 读取单笔订单，用于展示二维码时轮询支付结果。
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
