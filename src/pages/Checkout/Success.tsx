import { PageContainer } from '@ant-design/pro-components';
import { Button, Result, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { checkOrderPayment } from '@/services/api';
import { clearPendingOrder, peekPendingOrder } from '@/services/billing';
import { ApiError } from '@/services/request';
import type { OrderStatus } from '@/services/types';

/**
 * 重试查询的等待间隔（毫秒）。支付宝的异步通知常常晚于浏览器回跳，
 * 因此先立即查一次，之后逐步退让重试，避免给渠道太大的查询压力。
 */
const RETRY_DELAYS_MS = [1_000, 2_000, 3_000, 5_000, 5_000, 5_000, 5_000] as const;

const UNFINISHED_STATUSES: ReadonlyArray<OrderStatus> = [
  'FAILED',
  'EXPIRED',
  'REFUNDED',
];

type Phase = 'confirming' | 'paid' | 'pending' | 'closed' | 'unknown';

/**
 * 支付回跳落地页。支付宝只负责把浏览器带回来，不会因此发放许可证，
 * 所以这里主动向渠道查询订单状态（payment-check），而不是干等异步通知。
 */
export const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  // 回跳参数优先；它缺失时退回下单前暂存的订单号。
  const returnedOrderId = searchParams.get('out_trade_no');
  const orderIdRef = useRef<string | null>(
    returnedOrderId ?? peekPendingOrder(),
  );
  const [phase, setPhase] = useState<Phase>(
    orderIdRef.current ? 'confirming' : 'unknown',
  );
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const target = orderIdRef.current;
    if (!target) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    let waits = 0;

    const confirm = async () => {
      let settled: Phase | null = null;
      try {
        const order = await checkOrderPayment(target);
        if (order.status === 'PAID') {
          settled = 'paid';
        } else if (UNFINISHED_STATUSES.includes(order.status)) {
          settled = 'closed';
        }
      } catch (error) {
        // 订单不存在（含他人订单）：没有可确认的对象，直接结束。
        if (error instanceof ApiError && error.type === 'OrderNotFound') {
          settled = 'unknown';
        }
        // 其余情况（渠道暂不可达、网络抖动）保持重试。
      }

      if (cancelled) {
        return;
      }
      if (settled) {
        if (settled !== 'unknown') {
          clearPendingOrder();
        }
        setPhase(settled);
        return;
      }
      if (waits >= RETRY_DELAYS_MS.length) {
        setPhase('pending');
        return;
      }
      const delay = RETRY_DELAYS_MS[waits];
      waits += 1;
      timer = window.setTimeout(() => void confirm(), delay);
    };

    void confirm();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [retryToken]);

  const recheck = () => {
    setPhase('confirming');
    setRetryToken((value) => value + 1);
  };

  if (phase === 'confirming') {
    return (
      <PageContainer title="支付结果">
        <Result
          icon={<Spin size="large" />}
          title="正在确认支付结果…"
          subTitle="正在向支付宝查询本次支付的结果，通常几秒内完成。"
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

  if (phase === 'closed') {
    return (
      <PageContainer title="支付结果">
        <Result
          status="warning"
          title="支付未完成"
          subTitle="本次订单未完成支付，未开通任何订阅。如已扣款请保留订单号并联系我们。"
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
  }

  if (phase === 'pending') {
    return (
      <PageContainer title="支付结果">
        <Result
          status="warning"
          title="支付结果确认中"
          subTitle="暂未查询到支付成功的记录。如果你已完成付款，支付宝回执到达后订单会自动更新为已支付，可在订单记录中查看。"
          extra={[
            <Button type="primary" key="recheck" onClick={recheck}>
              重新查询
            </Button>,
            <Link to="/orders" key="orders">
              <Button>查看订单</Button>
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
