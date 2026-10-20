import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Descriptions, Result, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  findCatalogPlan,
  findPlanPrice,
  loadCatalogIndex,
} from '@/services/catalog';
import { PLAN_INTERVAL_DAYS, formatInterval } from '@/services/subscription';
import type {
  CatalogPlan,
  CatalogProduct,
  PlanInterval,
  PlanPrice,
} from '@/services/types';
import { formatMoney } from '@/utils/money';
import { useCheckout } from './useCheckout';

interface PurchaseDetail {
  readonly product: CatalogProduct;
  readonly plan: CatalogPlan;
  readonly price: PlanPrice;
}

/** 路径中的计费周期是 URL 友好的大写形式；其它值一律视为无效。 */
const toPlanInterval = (value: string): PlanInterval | null => {
  const upper = value.toUpperCase();
  return upper === 'MONTH' || upper === 'YEAR' ? upper : null;
};

/**
 * 确认订阅页。点击支付后创建订单并整页跳转支付宝收银台；买家完成或取消
 * 支付后，支付宝经后端 return_url 回到 `/checkout/result`，由结果页查询
 * 订单状态，本页不保存订单也不轮询。
 */
export const PurchasePage = () => {
  const { product = '', plan = '', interval = '' } = useParams();
  const targetProduct = decodeURIComponent(product);
  const targetPlan = decodeURIComponent(plan);
  const targetInterval = toPlanInterval(decodeURIComponent(interval));
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!targetInterval) {
      setDetail(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    loadCatalogIndex()
      .then((index) => {
        if (cancelled) {
          return;
        }
        const foundProduct = index.productByCode.get(targetProduct);
        const foundPlan = findCatalogPlan(index, targetProduct, targetPlan);
        const foundPrice = findPlanPrice(foundPlan, targetInterval);
        setDetail(
          foundProduct && foundPlan && foundPrice
            ? { product: foundProduct, plan: foundPlan, price: foundPrice }
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
  }, [targetProduct, targetPlan, targetInterval]);

  const { submitting, startCheckout } = useCheckout({
    product: targetProduct,
    plan: targetPlan,
    interval: targetInterval,
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
          title="未找到该版本"
          subTitle="它可能已下架，或该计费周期不可用，请返回产品目录重新选择。"
          extra={
            <Link to="/catalog">
              <Button type="primary">返回产品目录</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const amountLabel = formatMoney(detail.price.priceCents, detail.price.currency);

  return (
    <PageContainer title="确认订阅">
      <Card style={{ maxWidth: 560 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {detail.product.displayName} · {detail.plan.code}
          <Tag color="geekblue" style={{ marginLeft: 8 }}>
            {formatInterval(detail.price.interval)}
          </Tag>
        </Typography.Title>
        {detail.product.description && (
          <Typography.Paragraph type="secondary">
            {detail.product.description}
          </Typography.Paragraph>
        )}

        <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="价格">{amountLabel}</Descriptions.Item>
          <Descriptions.Item label="计费周期">
            {formatInterval(detail.price.interval)}（每{' '}
            {PLAN_INTERVAL_DAYS[detail.price.interval]} 天）
          </Descriptions.Item>
          <Descriptions.Item label="支付方式">支付宝（电脑网站支付）</Descriptions.Item>
          <Descriptions.Item label="生效时间">
            支付成功后立即生效，许可证会在几秒内发放
          </Descriptions.Item>
        </Descriptions>
        {detail.plan.trial && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
            message={`该版本含 ${detail.plan.trial.days} 天免费试用（最多 ${detail.plan.trial.maxActivations} 台设备）；此处的付费购买会直接开通正式订阅，不会先进入试用。`}
          />
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message="点击「前往支付宝支付」后会跳转到支付宝收银台，支付完成后自动返回本站显示结果。"
        />
        <Space>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => void startCheckout()}
          >
            前往支付宝支付
          </Button>
          <Link to="/catalog">
            <Button disabled={submitting}>返回产品目录</Button>
          </Link>
        </Space>
      </Card>
    </PageContainer>
  );
};
