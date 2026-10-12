import { getOrder } from './api';
import { ApiError } from './request';
import type { OrderStatus, OrderSummary } from './types';

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

/** 订单终态：之后不再变化，轮询到此结束。 */
export const SETTLED_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
];

/** 扫码期间轮询订单状态的默认间隔（毫秒）。 */
export const ORDER_POLL_INTERVAL_MS = 3_000;

export interface OrderPollingOptions {
  readonly orderId: string;
  /** 每次读到订单时回调，含终态那一次。 */
  readonly onOrder: (order: OrderSummary) => void;
  /** 订单已不存在（订单号无效或不属于当前用户）时回调。 */
  readonly onUnavailable?: () => void;
  readonly intervalMs?: number;
}

/**
 * 轮询订单状态直到有结论，返回停止轮询的函数。
 *
 * 后端这条路由只读自己的存储、不询问支付宝，因此轮询代价很低；页面在
 * 后台时跳过请求，回到前台立即补一次。单次失败（网络抖动、网关错误）
 * 不会中断轮询，下一轮继续。
 */
export const startOrderPolling = ({
  orderId,
  onOrder,
  onUnavailable,
  intervalMs = ORDER_POLL_INTERVAL_MS,
}: OrderPollingOptions): (() => void) => {
  let stopped = false;
  let timer = 0;
  let inFlight = false;

  const schedule = () => {
    if (!stopped) {
      timer = window.setTimeout(() => void poll(), intervalMs);
    }
  };

  const poll = async () => {
    if (stopped || inFlight) {
      return;
    }
    inFlight = true;
    try {
      if (!document.hidden) {
        const order = await getOrder(orderId);
        if (stopped) {
          return;
        }
        onOrder(order);
        if (SETTLED_ORDER_STATUSES.includes(order.status)) {
          return;
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.type === 'OrderNotFound') {
        stopped = true;
        onUnavailable?.();
        return;
      }
      // 其余情况（网络抖动、网关错误）忽略本次，下一轮继续。
    } finally {
      inFlight = false;
    }
    schedule();
  };

  // 回到前台时立刻补一次查询，而不是继续等下一个间隔。
  const handleVisible = () => {
    if (document.hidden) {
      return;
    }
    window.clearTimeout(timer);
    void poll();
  };

  void poll();
  document.addEventListener('visibilitychange', handleVisible);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', handleVisible);
  };
};
