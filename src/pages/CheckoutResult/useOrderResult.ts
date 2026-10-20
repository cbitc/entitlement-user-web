import { useEffect, useState } from 'react';
import { startOrderPolling } from '@/services/billing';
import type { OrderSummary } from '@/services/types';

/** 支付结果页的阶段。订单号缺失或订单不可读时不会给出支付结论。 */
export type OrderResultPhase =
  | { readonly kind: 'unverified' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'awaiting'; readonly order: OrderSummary }
  | { readonly kind: 'paid'; readonly order: OrderSummary }
  | { readonly kind: 'failed'; readonly order: OrderSummary }
  | { readonly kind: 'expired'; readonly order: OrderSummary };

/**
 * 查询支付宝收银台返回后的支付结果。
 *
 * `orderId` 由后端 return_url 重定向附加，只用于定位订单；结论始终以订单
 * 读模型为准。付款确认可能仍在进行，因此订单保持 PENDING 时持续轮询，
 * 直到 PAID / FAILED / EXPIRED 或支付截止时间。
 */
export const useOrderResult = (orderId: string | null): OrderResultPhase => {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [deadlineReached, setDeadlineReached] = useState(false);

  useEffect(() => {
    setOrder(null);
    setUnavailable(false);
    setDeadlineReached(false);
    if (!orderId) {
      return undefined;
    }
    return startOrderPolling({
      orderId,
      onOrder: (next) => {
        setOrder(next);
        setUnavailable(false);
      },
      onUnavailable: () => setUnavailable(true),
    });
  }, [orderId]);

  // 支付窗口到期：后端会关闭交易，页面不必继续等待。
  const expiresAt = order?.expiresAt ?? null;
  useEffect(() => {
    if (!expiresAt) {
      return undefined;
    }
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setDeadlineReached(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setDeadlineReached(true), remaining);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  if (!orderId) {
    return { kind: 'unverified' };
  }
  if (unavailable) {
    return { kind: 'unavailable' };
  }
  if (!order) {
    return { kind: 'loading' };
  }
  if (order.status === 'PAID') {
    return { kind: 'paid', order };
  }
  if (order.status === 'FAILED') {
    return { kind: 'failed', order };
  }
  if (order.status === 'EXPIRED' || deadlineReached) {
    return { kind: 'expired', order };
  }
  return { kind: 'awaiting', order };
};
