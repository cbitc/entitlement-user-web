import { App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckout } from '@/services/api';
import { startOrderPolling } from '@/services/billing';
import { ApiError } from '@/services/request';
import type { CheckoutErrorType, CheckoutResponse, OrderStatus } from '@/services/types';

/** 后端下单错误 → 中文提示（与后端 CreateCheckoutErrorType 一一对应）。 */
export const CHECKOUT_ERROR_MESSAGES: Readonly<
  Record<CheckoutErrorType, string>
> = {
  UnknownEdition: '该版本不存在',
  EditionUnavailable: '该版本已下架，无法购买',
  UnsupportedCurrency: '该版本不是人民币定价，暂不支持在线购买',
  EditionNotPurchasable: '该版本无法通过支付购买',
  SubscriptionAlreadyActive: '你已订阅该版本且仍在有效期内，无需重复购买',
  PaymentGatewayError: '支付宝暂时不可用，请稍后重试',
};

const CHECKOUT_ERROR_TYPES: ReadonlySet<string> = new Set(
  Object.keys(CHECKOUT_ERROR_MESSAGES),
);

/** 页面所处阶段。`intent` 非空即表示已下单，除 `idle` 外都属于下单之后。 */
export type CheckoutPhase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'awaiting' }
  | { readonly kind: 'paid' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'settledNonPaid'; readonly status: 'FAILED' | 'EXPIRED' };

interface UseCheckoutOptions {
  readonly product: string;
  readonly edition: string;
}

export interface UseCheckoutResult {
  readonly phase: CheckoutPhase;
  /** 下单返回的订单号与二维码内容；未下单时为 null。 */
  readonly intent: CheckoutResponse | null;
  readonly submitting: boolean;
  readonly startCheckout: () => Promise<void>;
  /** 丢弃当前订单，回到确认订阅（重新下单会创建新订单与新二维码）。 */
  readonly reset: () => void;
}

/**
 * 购买流程的状态机：负责下单、轮询支付结果与失败提示。
 *
 * 付款由支付宝异步通知后端、或后端对账轮询来确认，前端没有「主动核对」
 * 的接口；这里只轮询只读的订单路由，直到结果不再是 PENDING。二维码内容
 * 后端只下发一次、不存储，因此本 hook 不做持久化——页面刷新即丢失，
 * 由用户重新下单（会得到新订单与新二维码）。
 */
export const useCheckout = ({
  product,
  edition,
}: UseCheckoutOptions): UseCheckoutResult => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [intent, setIntent] = useState<CheckoutResponse | null>(null);
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [missing, setMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orderId = intent?.orderId ?? null;

  // 订单一旦创建就轮询，直到 PAID / FAILED / EXPIRED（终态）或订单不存在。
  useEffect(() => {
    if (!orderId) {
      return undefined;
    }
    return startOrderPolling({
      orderId,
      onOrder: (order) => setStatus(order.status),
      onUnavailable: () => setMissing(true),
    });
  }, [orderId]);

  const reset = useCallback(() => {
    setIntent(null);
    setStatus('PENDING');
    setMissing(false);
  }, []);

  const startCheckout = useCallback(async () => {
    setSubmitting(true);
    try {
      const created = await createCheckout({ product, edition });
      setStatus('PENDING');
      setMissing(false);
      setIntent(created);
    } catch (error) {
      if (error instanceof ApiError) {
        const localized = CHECKOUT_ERROR_TYPES.has(error.type)
          ? CHECKOUT_ERROR_MESSAGES[error.type as CheckoutErrorType]
          : undefined;
        message.error(localized ?? error.message);
        if (error.type === 'SubscriptionAlreadyActive') {
          navigate('/licenses');
        }
      } else {
        message.error('下单失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }, [product, edition, message, navigate]);

  const phase: CheckoutPhase = (() => {
    if (!intent) {
      return { kind: 'idle' };
    }
    if (missing) {
      return { kind: 'unavailable' };
    }
    if (status === 'PAID') {
      return { kind: 'paid' };
    }
    if (status === 'FAILED' || status === 'EXPIRED') {
      return { kind: 'settledNonPaid', status };
    }
    return { kind: 'awaiting' };
  })();

  return { phase, intent, submitting, startCheckout, reset };
};
