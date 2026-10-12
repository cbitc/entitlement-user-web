/** 后端金额以最小货币单位（分）计，这里渲染为本地化货币字符串。 */
export const formatMoney = (amountCents: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
};

/** 订阅时长的人类可读形式。 */
export const formatDuration = (days: number): string => {
  if (days > 0 && days % 365 === 0) {
    return `${days / 365} 年`;
  }
  if (days > 0 && days % 30 === 0) {
    return `${days / 30} 个月`;
  }
  return `${days} 天`;
};
