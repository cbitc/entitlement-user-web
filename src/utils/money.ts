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
