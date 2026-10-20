import { Space, Tag } from 'antd';
import {
  SUBSCRIPTION_STATUS_LABELS,
  isActiveLike,
  remainingDays,
  toDate,
} from '@/services/subscription';
import type { SubscriptionSummary } from '@/services/types';

/**
 * 订阅状态标签：主状态 + 期末取消标记 + 试用剩余天数。
 */
export const SubscriptionStatusTag = ({
  subscription,
}: {
  subscription: SubscriptionSummary;
}) => {
  const label = SUBSCRIPTION_STATUS_LABELS[subscription.status];
  const trialDays =
    subscription.status === 'TRIALING' && subscription.trialEnd
      ? remainingDays(subscription.trialEnd)
      : null;

  return (
    <Space size={4} wrap>
      <Tag color={label.color}>{label.text}</Tag>
      {subscription.cancelAtPeriodEnd && isActiveLike(subscription) && (
        <Tag color="warning">将于 {toDate(subscription.periodEnd)} 结束</Tag>
      )}
      {trialDays !== null && <Tag color="blue">剩余 {trialDays} 天试用</Tag>}
    </Space>
  );
};
