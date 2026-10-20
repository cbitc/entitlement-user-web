import { App } from 'antd';
import { useCallback, useState } from 'react';
import { createCheckout } from '@/services/api';
import { ApiError } from '@/services/request';
import type { CheckoutErrorType, PlanInterval } from '@/services/types';

/** 后端下单错误 → 中文提示（与后端 CreateCheckoutErrorType 一一对应）。 */
export const CHECKOUT_ERROR_MESSAGES: Readonly<
  Record<CheckoutErrorType, string>
> = {
  UnknownPlan: '该版本不存在',
  PlanUnavailable: '该版本已下架，无法购买',
  PlanIntervalUnavailable: '该版本未提供此计费周期，请重新选择',
  UnsupportedCurrency: '该版本不是人民币定价，暂不支持在线购买',
  PlanNotPurchasable: '该版本无法通过支付购买',
  PaymentGatewayError: '支付宝暂时不可用，请稍后重试',
};

const CHECKOUT_ERROR_TYPES: ReadonlySet<string> = new Set(
  Object.keys(CHECKOUT_ERROR_MESSAGES),
);

interface UseCheckoutOptions {
  readonly product: string;
  readonly plan: string;
  readonly interval: PlanInterval | null;
}

export interface UseCheckoutResult {
  readonly submitting: boolean;
  /** 创建订单并整页跳转支付宝收银台。 */
  readonly startCheckout: () => Promise<void>;
}

/**
 * 下单：创建订单后把买家送到支付宝收银台。
 *
 * 电脑网站支付必须整页离开本站：买家完成或取消支付后，支付宝会把浏览器
 * 跳回后端 return_url，再由后端 302 到 `/checkout/result`。因此这里不保存
 * 订单、也不轮询——查询结果统一由结果页根据 `orderId` 完成。
 */
export const useCheckout = ({
  product,
  plan,
  interval,
}: UseCheckoutOptions): UseCheckoutResult => {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = useCallback(async () => {
    if (!interval) {
      message.error('计费周期无效，请重新选择');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createCheckout({ product, plan, interval });
      // replace 而非 assign：从收银台返回后按浏览器后退不会回到下单页重复下单。
      window.location.replace(created.payUrl);
    } catch (error) {
      if (error instanceof ApiError) {
        const localized = CHECKOUT_ERROR_TYPES.has(error.type)
          ? CHECKOUT_ERROR_MESSAGES[error.type as CheckoutErrorType]
          : undefined;
        message.error(localized ?? error.message);
      } else {
        message.error('下单失败，请稍后重试');
      }
      setSubmitting(false);
    }
  }, [product, plan, interval, message]);

  return { submitting, startCheckout };
};
