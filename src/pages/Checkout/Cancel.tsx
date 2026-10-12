import { PageContainer } from '@ant-design/pro-components';
import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clearPendingOrder } from '@/services/billing';

/** 支付取消回跳落地页。 */
export const CheckoutCancelPage = () => {
  useEffect(() => {
    clearPendingOrder();
  }, []);

  return (
    <PageContainer title="支付结果">
      <Result
        status="warning"
        title="已取消支付"
        subTitle="本次订阅未完成支付，你可以随时重新购买。"
        extra={[
          <Link to="/catalog" key="catalog">
            <Button type="primary">返回产品目录</Button>
          </Link>,
          <Link to="/orders" key="orders">
            <Button>查看订单</Button>
          </Link>,
        ]}
      />
    </PageContainer>
  );
};
