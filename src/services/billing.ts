import { createCheckout } from './api';
import type { CheckoutSessionResponse, OrderStatus } from './types';

/** 订单状态 → 中文标签与展示颜色。 */
export const ORDER_STATUS_LABELS: Readonly<
  Record<OrderStatus, { readonly text: string; readonly color: string }>
> = {
  PENDING: { text: '待支付', color: 'processing' },
  PAID: { text: '已支付', color: 'success' },
  FAILED: { text: '支付失败', color: 'error' },
  EXPIRED: { text: '已过期', color: 'default' },
  REFUNDED: { text: '已退款', color: 'warning' },
};

const PENDING_ORDER_KEY = 'entitlement.checkout.pendingOrder';

/**
 * Stripe 回跳时不会带上订单号，因此下单前在 sessionStorage 里暂存，
 * 供成功页确认到账使用。
 */
export const rememberPendingOrder = (orderId: string): void => {
  sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
};

/** 只读取、不删除暂存的订单号。 */
export const peekPendingOrder = (): string | null =>
  sessionStorage.getItem(PENDING_ORDER_KEY);

/** 读取并清除暂存的订单号（确认完成后调用）。 */
export const clearPendingOrder = (): void => {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
};

/** 发起结账：创建订单并暂存订单号，返回支付渠道地址。 */
export const initiateCheckout = async (
  product: string,
  edition: string,
): Promise<CheckoutSessionResponse> => {
  const session = await createCheckout({ product, edition });
  rememberPendingOrder(session.orderId);
  return session;
};
