import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

/** 支付结果视图的形态：已开通、订单不可用、下单后未支付。 */
export type CheckoutResultVariant =
  | { readonly kind: 'paid' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'settledNonPaid'; readonly status: 'FAILED' | 'EXPIRED' };

interface CheckoutResultProps {
  readonly variant: CheckoutResultVariant;
  readonly onReset: () => void;
}

/** 三种支付结果视图。成功页引导去订阅页，未支付页引导重新下单。 */
export const CheckoutResult = ({ variant, onReset }: CheckoutResultProps) => {
  if (variant.kind === 'paid') {
    return (
      <Result
        status="success"
        title="订阅已开通"
        subTitle="订阅已生效，许可证会在几秒内发放；随后即可在「我的订阅」中激活设备。"
        extra={[
          <Link to="/subscriptions" key="subscriptions">
            <Button type="primary">查看我的订阅</Button>
          </Link>,
          <Link to="/orders" key="orders">
            <Button>查看订单</Button>
          </Link>,
        ]}
      />
    );
  }

  if (variant.kind === 'unavailable') {
    return (
      <Result
        status="info"
        title="没有待确认的支付"
        subTitle="未找到本次下单的订单信息，请重新下单。"
        extra={
          <Button type="primary" onClick={onReset}>
            重新下单
          </Button>
        }
      />
    );
  }

  const expired = variant.status === 'EXPIRED';
  return (
    <Result
      status="warning"
      title={expired ? '二维码已失效' : '支付未完成'}
      subTitle={
        expired
          ? '这笔订单的付款时限已过，未开通任何订阅。请重新下单获取新的二维码。'
          : '本次订单未能完成，未开通任何订阅。如已扣款请保留订单号并联系我们。'
      }
      extra={[
        <Button type="primary" key="retry" onClick={onReset}>
          重新下单
        </Button>,
        <Link to="/catalog" key="catalog">
          <Button>返回产品目录</Button>
        </Link>,
        <Link to="/orders" key="orders">
          <Button type="link">查看订单</Button>
        </Link>,
      ]}
    />
  );
};
