import { Button, Result, Spin } from 'antd';
import { Link } from 'react-router-dom';
import type { OrderResultPhase } from './useOrderResult';

interface CheckoutResultProps {
  readonly phase: OrderResultPhase;
}

/**
 * 支付结果视图。支付宝返回后订单可能仍在确认中，因此除了终态还会展示
 * 等待状态；所有结论都来自后端订单读模型，不解析支付宝回跳参数。
 */
export const CheckoutResult = ({ phase }: CheckoutResultProps) => {
  if (phase.kind === 'loading') {
    return (
      <Result
        icon={<Spin size="large" />}
        title="正在查询订单状态"
        subTitle="正在读取这笔订单的支付结果，请稍候。"
        extra={[
          <Link to="/orders" key="orders">
            <Button>查看我的订单</Button>
          </Link>,
          <Link to="/catalog" key="catalog">
            <Button>返回产品目录</Button>
          </Link>,
        ]}
      />
    );
  }

  if (phase.kind === 'awaiting') {
    return (
      <Result
        icon={<Spin size="large" />}
        title="正在确认支付结果"
        subTitle={`本页会自动更新支付结果。若你已取消支付，可稍后在「我的订单」查看；未完成的订单将在 ${new Date(
          phase.order.expiresAt,
        ).toLocaleString()} 后关闭。`}
        extra={[
          <Link to="/orders" key="orders">
            <Button type="primary">查看我的订单</Button>
          </Link>,
          <Link to="/catalog" key="catalog">
            <Button>返回产品目录</Button>
          </Link>,
        ]}
      />
    );
  }

  if (phase.kind === 'paid') {
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

  if (phase.kind === 'unverified') {
    return (
      <Result
        status="info"
        title="无法确认支付结果"
        subTitle="未能从支付宝的返回信息中确认本次订单。若已完成付款，请到「我的订单」查看支付状态；如仍未开通，请保留付款记录联系我们。"
        extra={[
          <Link to="/orders" key="orders">
            <Button type="primary">查看我的订单</Button>
          </Link>,
          <Link to="/catalog" key="catalog">
            <Button>返回产品目录</Button>
          </Link>,
        ]}
      />
    );
  }

  if (phase.kind === 'unavailable') {
    return (
      <Result
        status="warning"
        title="未找到该订单"
        subTitle="订单号无效，或该订单不属于当前账号。请到「我的订单」查看最近的支付记录。"
        extra={[
          <Link to="/orders" key="orders">
            <Button type="primary">查看我的订单</Button>
          </Link>,
          <Link to="/catalog" key="catalog">
            <Button>返回产品目录</Button>
          </Link>,
        ]}
      />
    );
  }

  if (phase.kind === 'failed') {
    return (
      <Result
        status="warning"
        title="支付未完成"
        subTitle="本次订单未能完成，未开通任何订阅。如已扣款请保留订单号并联系我们。"
        extra={[
          <Link to="/catalog" key="catalog">
            <Button type="primary">重新选择版本</Button>
          </Link>,
          <Link to="/orders" key="orders">
            <Button>查看订单</Button>
          </Link>,
        ]}
      />
    );
  }

  return (
    <Result
      status="warning"
      title="支付已超时"
      subTitle="这笔订单已关闭，未开通任何订阅。请重新选择版本并完成支付。"
      extra={[
        <Link to="/catalog" key="catalog">
          <Button type="primary">重新选择版本</Button>
        </Link>,
        <Link to="/orders" key="orders">
          <Button>查看订单</Button>
        </Link>,
      ]}
    />
  );
};
