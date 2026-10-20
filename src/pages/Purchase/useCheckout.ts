import { App } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCheckout } from '@/services/api';
import { startOrderPolling } from '@/services/billing';
import { ApiError } from '@/services/request';
import type {
  CheckoutErrorType,
  CheckoutResponse,
  OrderStatus,
  OrderSummary,
} from '@/services/types';

/** 后端下单错误 → 中文提示（与后端 CreateCheckoutErrorType 一一对应）。 */
export const CHECKOUT_ERROR_MESSAGES: Readonly<
  Record<CheckoutErrorType, string>
> = {
  UnknownPlan: '该套餐不存在',
  PlanUnavailable: '该套餐已下架，无法购买',
  SubscriptionAlreadyActive: '你已订阅该产品且仍在有效期内，无需重复购买',
  UnsupportedCurrency: '该套餐不是人民币定价，暂不支持在线购买',
  PlanNotPurchasable: '该套餐无法通过支付购买',
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
  readonly plan: string;
}

export interface UseCheckoutResult {
  readonly phase: CheckoutPhase;
  /** 下单返回的订单号与二维码内容；未下单时为 null。 */
  readonly intent: CheckoutResponse | null;
  /** 最近一次轮询到的订单（含支付截止时间）；未下单时为 null。 */
  readonly order: OrderSummary | null;
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
 *
 * 订单读模型带 `expiresAt`：到达支付截止时间后停止轮询，并把仍在
 * PENDING 的订单纯前端视为失效（后端清扫会把订单置为 EXPIRED，这里只是
 * 提前给出结论，不作为授权依据）。
 */
export const useCheckout = ({
  product,
  plan,
}: UseCheckoutOptions): UseCheckoutResult => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [intent, setIntent] = useState<CheckoutResponse | null>(null);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [missing, setMissing] = useState(false);
  const [deadlineReached, setDeadlineReached] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orderId = intent?.orderId ?? null;

  // 订单一旦创建就轮询，直到 PAID / FAILED / EXPIRED（终态）或订单不存在。
  useEffect(() => {
    if (!orderId) {
      return undefined;
    }
    return startOrderPolling({
      orderId,
      onOrder: (next) => {
        setOrder(next);
        setMissing(false);
      },
      onUnavailable: () => setMissing(true),
    });
  }, [orderId]);

  // 支付窗口到期：停止等待，让页面给出「二维码已失效」的结论。
  const expiresAt = order?.expiresAt ?? null;
  useEffect(() => {
    if (!expiresAt) {
      setDeadlineReached(false);
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

  const reset = useCallback(() => {
    setIntent(null);
    setOrder(null);
    setMissing(false);
    setDeadlineReached(false);
  }, []);

  const startCheckout = useCallback(async () => {
    setSubmitting(true);
    try {
      const created = await createCheckout({ product, plan });
      setOrder(null);
      setMissing(false);
      setDeadlineReached(false);
      setIntent(created);
    } catch (error) {
      if (error instanceof ApiError) {
        const localized = CHECKOUT_ERROR_TYPES.has(error.type)
          ? CHECKOUT_ERROR_MESSAGES[error.type as CheckoutErrorType]
          : undefined;
        message.error(localized ?? error.message);
        if (error.type === 'SubscriptionAlreadyActive') {
          navigate('/subscriptions');
        }
      } else {
        message.error('下单失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }, [product, plan, message, navigate]);

  const status: OrderStatus = order?.status ?? 'PENDING';

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
    if (deadlineReached) {
      return { kind: 'settledNonPaid', status: 'EXPIRED' };
    }
    return { kind: 'awaiting' };
  })();

  return { phase, intent, order, submitting, startCheckout, reset };
};
