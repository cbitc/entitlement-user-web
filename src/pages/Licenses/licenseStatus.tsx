import dayjs from 'dayjs';
import { Tag } from 'antd';
import type { LicenseSummary } from '@/services/types';

/** 订阅是否处于有效期内。 */
export const isLicenseActive = (license: LicenseSummary): boolean =>
  dayjs(license.periodEnd).isAfter(dayjs());

/** 剩余天数（已过期返回 0）。 */
export const remainingDays = (license: LicenseSummary): number =>
  Math.max(0, dayjs(license.periodEnd).diff(dayjs(), 'day'));

export const LicenseStatusTag = ({ license }: { license: LicenseSummary }) => {
  if (!isLicenseActive(license)) {
    return <Tag>已过期</Tag>;
  }
  const days = remainingDays(license);
  if (days <= 7) {
    return <Tag color="warning">剩余 {days} 天</Tag>;
  }
  return <Tag color="success">有效</Tag>;
};
