import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listCatalog } from '@/services/api';
import type { CatalogEdition, CatalogProduct } from '@/services/types';
import { formatDuration, formatMoney } from '@/utils/money';
import { CheckoutResult, type CheckoutResultVariant } from './CheckoutResult';
import { QrPaymentPanel } from './QrPaymentPanel';
import { useCheckout } from './useCheckout';

interface PurchaseDetail {
  readonly product: CatalogProduct;
  readonly edition: CatalogEdition;
}

/**
 * 确认订阅页。下单后支付宝返回二维码内容，买家在本页扫码付款；付款由
 * 支付宝异步通知后端、或后端对账轮询来确认，本页只需轮询订单状态直到
 * 结果确定（全程不离开本站，无跳转、也无主动核对）。
 */
export const PurchasePage = () => {
  const { product = '', edition = '' } = useParams();
  const targetProduct = decodeURIComponent(product);
  const targetEdition = decodeURIComponent(edition);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);

  useEffect(() => {
    listCatalog()
      .then((data) => {
        const foundProduct = data.products.find(
          (item) => item.code === targetProduct,
        );
        const foundEdition = foundProduct?.editions.find(
          (item) => item.code === targetEdition,
        );
        setDetail(
          foundProduct && foundEdition
            ? { product: foundProduct, edition: foundEdition }
            : null,
        );
      })
      .catch(() => setDetail(null));
  }, [targetProduct, targetEdition]);

  const { phase, intent, submitting, startCheckout, reset } = useCheckout({
    product: targetProduct,
    edition: targetEdition,
  });

  const title = detail ? detail.product.displayName : targetProduct;
  const amountLabel = detail
    ? formatMoney(detail.edition.priceCents, detail.edition.currency)
    : '—';

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
          {title} · {targetEdition}
        </Typography.Title>
        {detail?.product.description && (
          <Typography.Paragraph type="secondary">
            {detail.product.description}
          </Typography.Paragraph>
        )}

        {intent ? (
          <QrPaymentPanel
            intent={intent}
            amountLabel={amountLabel}
            onReset={reset}
          />
        ) : (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="价格">{amountLabel}</Descriptions.Item>
              <Descriptions.Item label="订阅时长">
                {detail ? formatDuration(detail.edition.durationDays) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">支付宝扫码</Descriptions.Item>
              <Descriptions.Item label="生效时间">
                支付成功后立即生效
              </Descriptions.Item>
            </Descriptions>
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

