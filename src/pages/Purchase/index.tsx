import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Descriptions, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listCatalog } from '@/services/api';
import { initiateCheckout } from '@/services/billing';
import { ApiError } from '@/services/request';
import type { CatalogEdition, CatalogProduct } from '@/services/types';
import { formatDuration, formatMoney } from '@/utils/money';

/** 后端结账错误 → 中文提示。 */
const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  SubscriptionAlreadyActive: '你已订阅该版本且仍在有效期内，无需重复购买',
  EditionUnavailable: '该版本已下架，无法购买',
  UnknownEdition: '该版本不存在',
  PaymentGatewayError: '支付宝暂时不可用，请稍后重试',
};

interface PurchaseDetail {
  readonly product: CatalogProduct;
  readonly edition: CatalogEdition;
}

/** 确认订阅页：展示定价并发起结账，随后跳出到支付渠道。 */
export const PurchasePage = () => {
  const { product = '', edition = '' } = useParams();
  const targetProduct = decodeURIComponent(product);
  const targetEdition = decodeURIComponent(edition);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      const session = await initiateCheckout(targetProduct, targetEdition);
      // 跳出本页到支付宝收银台；付款后由支付宝把浏览器带回 /checkout/success。
      window.location.assign(session.checkoutUrl);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(CHECKOUT_ERROR_MESSAGES[error.type] ?? error.message);
        if (error.type === 'SubscriptionAlreadyActive') {
          navigate('/licenses');
        }
      } else {
        message.error('发起支付失败，请稍后重试');
      }
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="确认订阅">
      <Card style={{ maxWidth: 560 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {detail ? detail.product.displayName : targetProduct} · {targetEdition}
        </Typography.Title>
        {detail?.product.description && (
          <Typography.Paragraph type="secondary">
            {detail.product.description}
          </Typography.Paragraph>
        )}
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
          <Descriptions.Item label="价格">
            {detail
              ? formatMoney(detail.edition.priceCents, detail.edition.currency)
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="订阅时长">
            {detail ? formatDuration(detail.edition.durationDays) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="支付方式">支付宝</Descriptions.Item>
          <Descriptions.Item label="生效时间">
            支付成功后立即生效
          </Descriptions.Item>
        </Descriptions>
        <Space>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => void handleCheckout()}
          >
            去支付宝支付
          </Button>
          <Link to="/catalog">
            <Button disabled={submitting}>返回产品目录</Button>
          </Link>
        </Space>
      </Card>
    </PageContainer>
  );
};
