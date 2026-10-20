import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Descriptions, Result, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadCatalogIndex } from '@/services/catalog';
import { PLAN_INTERVAL_DAYS, formatInterval } from '@/services/subscription';
import type { CatalogPlan, CatalogProduct } from '@/services/types';
import { formatMoney } from '@/utils/money';
import { CheckoutResult, type CheckoutResultVariant } from './CheckoutResult';
import { QrPaymentPanel } from './QrPaymentPanel';
import { useCheckout } from './useCheckout';

interface PurchaseDetail {
  readonly product: CatalogProduct;
  readonly plan: CatalogPlan;
}

/**
 * 确认订阅页。下单后支付宝返回二维码内容，买家在本页扫码付款；付款由
 * 支付宝异步通知后端、或后端对账轮询来确认，本页只需轮询订单状态直到
 * 结果确定（全程不离开本站，无跳转、也无主动核对）。
 */
export const PurchasePage = () => {
  const { product = '', plan = '' } = useParams();
  const targetProduct = decodeURIComponent(product);
  const targetPlan = decodeURIComponent(plan);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCatalogIndex()
      .then((index) => {
        if (cancelled) {
          return;
        }
        const foundProduct = index.productByCode.get(targetProduct);
        const foundPlan = foundProduct?.plans.find(
          (item) => item.code === targetPlan,
        );
        setDetail(
          foundProduct && foundPlan
            ? { product: foundProduct, plan: foundPlan }
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [targetProduct, targetPlan]);

  const { phase, intent, order, submitting, startCheckout, reset } = useCheckout({
    product: targetProduct,
    plan: targetPlan,
  });

  if (loading) {
    return (
      <PageContainer>
        <Spin style={{ display: 'block', margin: '120px auto' }} />
      </PageContainer>
    );
  }

  if (!detail) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="未找到该套餐"
          subTitle="它可能已下架，请返回产品目录重新选择。"
          extra={
            <Link to="/catalog">
              <Button type="primary">返回产品目录</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const amountLabel = formatMoney(detail.plan.priceCents, detail.plan.currency);
  const result: CheckoutResultVariant | null =
    phase.kind === 'paid'
      ? { kind: 'paid' }
      : phase.kind === 'unavailable'
        ? { kind: 'unavailable' }
        : phase.kind === 'settledNonPaid'
          ? { kind: 'settledNonPaid', status: phase.status }
          : null;

  if (result) {
    return (
      <PageContainer title="支付结果">
        <CheckoutResult variant={result} onReset={reset} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={intent ? '扫码支付' : '确认订阅'}>
      <Card style={{ maxWidth: 560 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {detail.product.displayName} · {detail.plan.code}
          <Tag color="geekblue" style={{ marginLeft: 8 }}>
            {formatInterval(detail.plan.interval)}
          </Tag>
        </Typography.Title>
        {detail.product.description && (
          <Typography.Paragraph type="secondary">
            {detail.product.description}
          </Typography.Paragraph>
        )}

        {intent ? (
          <QrPaymentPanel
            intent={intent}
            amountLabel={amountLabel}
            expiresAt={order?.expiresAt ?? null}
            onReset={reset}
          />
        ) : (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="价格">{amountLabel}</Descriptions.Item>
              <Descriptions.Item label="计费周期">
                {formatInterval(detail.plan.interval)}（每{' '}
                {PLAN_INTERVAL_DAYS[detail.plan.interval]} 天）
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">支付宝扫码</Descriptions.Item>
              <Descriptions.Item label="生效时间">
                支付成功后立即生效，许可证会在几秒内发放
              </Descriptions.Item>
            </Descriptions>
            {detail.plan.trialDays > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
                message={`该套餐含 ${detail.plan.trialDays} 天免费试用；此处的付费购买会直接开通正式订阅，不会先进入试用。`}
              />
            )}
            <Space>
              <Button
                type="primary"
                loading={submitting}
                onClick={() => void startCheckout()}
              >
                生成支付二维码
              </Button>
              <Link to="/catalog">
                <Button disabled={submitting}>返回产品目录</Button>
              </Link>
            </Space>
          </>
        )}
      </Card>
    </PageContainer>
  );
};
