import dayjs from 'dayjs';
import type {
  CancelErrorType,
  PlanInterval,
  SubscriptionStatus,
  SubscriptionSummary,
  TrialErrorType,
} from './types';

/** 仍然授予权益的状态；`PAST_DUE` 在宽限期内继续可用。 */
export const ACTIVE_LIKE_STATUSES: ReadonlyArray<SubscriptionStatus> = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
];

/** 已付费（非试用）的状态；只有这些状态会阻止再次购买同一产品。 */
export const PAID_STATUSES: ReadonlyArray<SubscriptionStatus> = [
  'ACTIVE',
  'PAST_DUE',
];

/** 订阅状态 → 中文标签与展示颜色。 */
export const SUBSCRIPTION_STATUS_LABELS: Readonly<
  Record<SubscriptionStatus, { readonly text: string; readonly color: string }>
> = {
  INCOMPLETE: { text: '待支付', color: 'default' },
  TRIALING: { text: '试用中', color: 'processing' },
  ACTIVE: { text: '有效', color: 'success' },
  PAST_DUE: { text: '逾期', color: 'warning' },
  CANCELED: { text: '已取消', color: 'default' },
  EXPIRED: { text: '已过期', color: 'default' },
};

/** 计费周期 → 中文标签。 */
export const PLAN_INTERVAL_LABELS: Readonly<Record<PlanInterval, string>> = {
  MONTH: '月付',
  YEAR: '年付',
};

/** 与后端 `planIntervalDays` 一致：按固定天数折算，不建模自然月。 */
export const PLAN_INTERVAL_DAYS: Readonly<Record<PlanInterval, number>> = {
  MONTH: 30,
  YEAR: 365,
};

export const formatInterval = (interval: PlanInterval): string =>
  PLAN_INTERVAL_LABELS[interval];

/** 订阅是否仍在有效期内（状态为 active-like 且未到期末）。 */
export const isActiveLike = (
  subscription: SubscriptionSummary,
  now: number = Date.now(),
): boolean =>
  ACTIVE_LIKE_STATUSES.includes(subscription.status) &&
  new Date(subscription.periodEnd).getTime() >= now;

/** 订阅是否为已付费且仍有效（试用不算）。 */
export const isPaidLike = (
  subscription: SubscriptionSummary,
  now: number = Date.now(),
): boolean =>
  PAID_STATUSES.includes(subscription.status) &&
  new Date(subscription.periodEnd).getTime() >= now;

/** 订阅当前是否覆盖某个产品。 */
export const coversProduct = (
  subscription: SubscriptionSummary,
  product: string,
  now: number = Date.now(),
): boolean =>
  isActiveLike(subscription, now) &&
  subscription.items.some((item) => item.product === product);

/** 是否有任何订阅覆盖该产品（试用/有效/逾期）。 */
export const hasActiveCoverage = (
  subscriptions: ReadonlyArray<SubscriptionSummary>,
  product: string,
  now: number = Date.now(),
): boolean =>
  subscriptions.some((subscription) => coversProduct(subscription, product, now));

/** 是否有已付费订阅覆盖该产品（试用不阻止购买）。 */
export const hasPaidCoverage = (
  subscriptions: ReadonlyArray<SubscriptionSummary>,
  product: string,
  now: number = Date.now(),
): boolean =>
  subscriptions.some(
    (subscription) =>
      isPaidLike(subscription, now) &&
      subscription.items.some((item) => item.product === product),
  );

/** 目录页所需的单产品覆盖情况。 */
export interface ProductCoverage {
  /** 任一 active-like 订阅覆盖（阻断再次试用）。 */
  readonly hasActive: boolean;
  /** 已付费覆盖（阻断购买；月付/年付互斥）。 */
  readonly hasPaid: boolean;
  /** 当前处于试用期。 */
  readonly isTrialing: boolean;
  /** 覆盖该产品的 active-like 订阅项所用套餐代码。 */
  readonly planCodes: ReadonlySet<string>;
}

export const productCoverage = (
  subscriptions: ReadonlyArray<SubscriptionSummary>,
  product: string,
  now: number = Date.now(),
): ProductCoverage => {
  const covering = subscriptions.filter((subscription) =>
    coversProduct(subscription, product, now),
  );
  return {
    hasActive: covering.length > 0,
    hasPaid: covering.some((subscription) => isPaidLike(subscription, now)),
    isTrialing: covering.some(
      (subscription) => subscription.status === 'TRIALING',
    ),
    planCodes: new Set(
      covering.flatMap((subscription) =>
        subscription.items
          .filter((item) => item.product === product)
          .map((item) => item.plan),
      ),
    ),
  };
};

/** 距某个时间点还剩多少天（已过去返回 0）。 */
export const remainingDays = (iso: string): number =>
  Math.max(0, dayjs(iso).diff(dayjs(), 'day'));

/** 后端返回完整 ISO 时间，列表只展示到日。 */
export const toDate = (iso: string): string => iso.slice(0, 10);

/** 试用失败错误 → 中文提示。 */
export const TRIAL_ERROR_MESSAGES: Readonly<Record<TrialErrorType, string>> = {
  UnknownPlan: '该套餐不存在',
  PlanUnavailable: '该套餐已下架，无法试用',
  TrialNotAvailable: '该套餐不提供免费试用',
  SubscriptionAlreadyActive: '该产品已有生效中的订阅或试用，无法重复试用',
};

/** 取消订阅失败错误 → 中文提示。 */
export const CANCEL_ERROR_MESSAGES: Readonly<Record<CancelErrorType, string>> = {
  NotFound: '未找到该订阅',
  InvalidTransition: '当前状态的订阅无法取消',
};
