import { request } from './request';
import type {
  CatalogResponse,
  CheckoutSessionResponse,
  LicenseListResponse,
  OrderListResponse,
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

/** 创建结账会话，返回支付渠道的托管结账页地址。 */
export const createCheckout = (params: { product: string; edition: string }) =>
  request
    .post<CheckoutSessionResponse>('/billing/checkout', params)
    .then((res) => res.data);

/** 当前用户的订单记录（按创建时间倒序）。 */
export const listOrders = () =>
  request.get<OrderListResponse>('/billing/orders').then((res) => res.data);
