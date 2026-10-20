import dayjs from 'dayjs';
import type {
  PlanInterval,
  SubscriptionStatus,
  SubscriptionSummary,
  TrialErrorType,
} from './types';

/** 当前授予权益的状态；`FROZEN` 保留合同但权益被暂停。 */
export const ENTITLED_STATUSES: ReadonlyArray<SubscriptionStatus> = [
  'TRIALING',
  'ACTIVE',
];

/** 仍占用产品的状态：开放合同不能重复试用；再次购买会续费或切换版本。 */
export const OPEN_STATUSES: ReadonlyArray<SubscriptionStatus> = [
  'TRIALING',
  'ACTIVE',
  'FROZEN',
];

/** 订阅状态 → 中文标签与展示颜色。 */
export const SUBSCRIPTION_STATUS_LABELS: Readonly<
  Record<SubscriptionStatus, { readonly text: string; readonly color: string }>
> = {
  TRIALING: { text: '试用中', color: 'processing' },
  ACTIVE: { text: '有效', color: 'success' },
  FROZEN: { text: '已冻结', color: 'warning' },
  EXPIRED: { text: '已过期', color: 'default' },
};

/** 计费周期 → 中文标签。 */
export const PLAN_INTERVAL_LABELS: Readonly<Record<PlanInterval, string>> = {
  MONTH: '月付',
  YEAR: '年付',
};

/** 目录页的分组顺序：月付在前，年付在后。 */
export const PLAN_INTERVALS: ReadonlyArray<PlanInterval> = ['MONTH', 'YEAR'];

/** 与后端 `planIntervalDays` 一致：按固定天数折算，不建模自然月。 */
export const PLAN_INTERVAL_DAYS: Readonly<Record<PlanInterval, number>> = {
  MONTH: 30,
  YEAR: 365,
};

export const formatInterval = (interval: PlanInterval): string =>
  PLAN_INTERVAL_LABELS[interval];

/** 订阅是否正在授予权益（TRIALING/ACTIVE 且未到期末）。 */
export const isEntitled = (
  subscription: SubscriptionSummary,
  now: number = Date.now(),
): boolean =>
  ENTITLED_STATUSES.includes(subscription.status) &&
  new Date(subscription.periodEnd).getTime() >= now;

/**
 * 订阅是否仍占用产品（TRIALING/ACTIVE/FROZEN 且未到期末）。
 * 冻结的合同不授予权益，但也不允许再开一份新合同把它绕过去。
 */
export const isOpen = (
  subscription: SubscriptionSummary,
  now: number = Date.now(),
): boolean =>
  OPEN_STATUSES.includes(subscription.status) &&
  new Date(subscription.periodEnd).getTime() >= now;

/** 任一开放订阅占用该产品。 */
export const hasOpenCoverage = (
  subscriptions: ReadonlyArray<SubscriptionSummary>,
  product: string,
  now: number = Date.now(),
): boolean =>
  subscriptions.some(
    (subscription) =>
      isOpen(subscription, now) &&
      subscription.items.some((item) => item.product === product),
  );

/** 目录页所需的单产品覆盖情况。 */
export interface ProductCoverage {
  /** 任一开放订阅占用（试用/有效/冻结），阻断再次试用。 */
  readonly hasOpen: boolean;
  /** ACTIVE/FROZEN 占用；仅用于展示已订阅状态，购买会续费或切换版本。 */
  readonly hasPaid: boolean;
  /** 当前处于试用期。 */
  readonly isTrialing: boolean;
  /** 当前被管理员冻结。 */
  readonly isFrozen: boolean;
  /** 占用该产品的开放订阅项所用版本代码。 */
  readonly planCodes: ReadonlySet<string>;
}

export const productCoverage = (
  subscriptions: ReadonlyArray<SubscriptionSummary>,
  product: string,
  now: number = Date.now(),
): ProductCoverage => {
  const covering = subscriptions.filter(
    (subscription) =>
      isOpen(subscription, now) &&
      subscription.items.some((item) => item.product === product),
  );
  return {
    hasOpen: covering.length > 0,
    hasPaid: covering.some(
      (subscription) =>
        subscription.status === 'ACTIVE' || subscription.status === 'FROZEN',
    ),
    isTrialing: covering.some(
      (subscription) => subscription.status === 'TRIALING',
    ),
    isFrozen: covering.some(
      (subscription) => subscription.status === 'FROZEN',
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
  UnknownPlan: '该版本不存在',
  PlanUnavailable: '该版本已下架，无法试用',
  TrialNotAvailable: '该版本不提供免费试用',
  TrialAlreadyUsed: '该产品已使用过试用，每个账号每个产品只能试用一次',
  SubscriptionAlreadyActive: '该产品已有订阅或试用，无法重复试用',
};
