import { PageContainer } from '@ant-design/pro-components';
import { Button, Result, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '@/services/api';
import { clearPendingOrder, peekPendingOrder } from '@/services/billing';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

type Phase = 'confirming' | 'paid' | 'timeout' | 'unknown';

/**
 * 支付回跳落地页。许可证由支付渠道的 webhook 异步授予，
 * 因此这里轮询订单状态直到变为已支付（或超时）。
 */
export const CheckoutSuccessPage = () => {
  const orderIdRef = useRef<string | null>(peekPendingOrder());
  const [phase, setPhase] = useState<Phase>(
    orderIdRef.current ? 'confirming' : 'unknown',
  );

  useEffect(() => {
    const target = orderIdRef.current;
    if (!target) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const { orders } = await listOrders();
        const order = orders.find((item) => item.orderId === target);
        if (cancelled) {
          return;
        }
        if (order?.status === 'PAID') {
          clearPendingOrder();
          setPhase('paid');
          return;
        }
        if (order?.status === 'FAILED' || order?.status === 'EXPIRED') {
          clearPendingOrder();
          setPhase('timeout');
          return;
        }
      } catch {
        // 网络抖动：忽略本次失败，继续轮询。
      }
      if (cancelled) {
        return;
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setPhase('timeout');
        return;
      }
      timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (phase === 'confirming') {
    return (
      <PageContainer title="支付结果">
        <Result
          icon={<Spin size="large" />}
          title="正在确认支付结果…"
          subTitle="支付已完成，正在等待支付渠道回执，通常几秒内完成。"
        />
      </PageContainer>
    );
  }

  if (phase === 'paid') {
    return (
      <PageContainer title="支付结果">
        <Result
          status="success"
          title="订阅已开通"
          subTitle="许可证已发放，现在就可以激活你的设备了。"
          extra={[
            <Link to="/licenses" key="licenses">
              <Button type="primary">查看我的许可证</Button>
            </Link>,
            <Link to="/orders" key="orders">
              <Button>查看订单</Button>
            </Link>,
          ]}
        />
      </PageContainer>
    );
  }

  if (phase === 'timeout') {
    return (
      <PageContainer title="支付结果">
        <Result
          status="warning"
          title="支付结果确认中"
          subTitle="暂未收到支付渠道回执。若已完成支付，订单会自动更新为已支付，可在订单记录中查看。"
          extra={[
            <Link to="/orders" key="orders">
              <Button type="primary">查看订单</Button>
            </Link>,
            <Link to="/licenses" key="licenses">
              <Button>我的许可证</Button>
            </Link>,
          ]}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="支付结果">
      <Result
        status="info"
        title="没有待确认的支付"
        subTitle="未找到本次支付的订单信息。"
        extra={
          <Link to="/catalog">
            <Button type="primary">返回产品目录</Button>
          </Link>
        }
      />
    </PageContainer>
  );
};
