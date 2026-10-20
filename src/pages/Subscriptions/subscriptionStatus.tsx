import { Space, Tag } from 'antd';
import { SUBSCRIPTION_STATUS_LABELS, remainingDays } from '@/services/subscription';
import type { SubscriptionSummary } from '@/services/types';

/**
 * 订阅状态标签：主状态 + 试用剩余天数。
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
      {trialDays !== null && <Tag color="blue">剩余 {trialDays} 天试用</Tag>}
    </Space>
  );
};
