import { PageContainer } from '@ant-design/pro-components';
import { useSearchParams } from 'react-router-dom';
import { CheckoutResult } from './CheckoutResult';
import { useOrderResult } from './useOrderResult';

/**
 * 支付结果页。后端（`ALIPAY_RETURN_REDIRECT_URL`）在支付宝回跳并核对
 * 订单后把买家 302 到这里，可信时附带 `?orderId=...`。
 */
export const CheckoutResultPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const phase = useOrderResult(orderId);

  return (
    <PageContainer title="支付结果">
      <CheckoutResult phase={phase} />
    </PageContainer>
  );
};
