import { PageContainer } from '@ant-design/pro-components';
import { App, Alert, Button, Card, Descriptions, Result, Space, Spin, Typography } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { checkOrderPayment, createCheckout, listCatalog } from '@/services/api';
import { SETTLED_ORDER_STATUSES, startOrderPolling } from '@/services/billing';
import { ApiError } from '@/services/request';
import type { CatalogEdition, CatalogProduct, CheckoutResponse, OrderStatus } from '@/services/types';
import { formatDuration, formatMoney } from '@/utils/money';

/** 后端下单错误 → 中文提示。 */
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

/**
 * 确认订阅页。下单后支付宝返回二维码内容，买家在本页扫码付款，
 * 页面轮询订单状态直到支付结果确定（全程不离开本站）。
 */
export const PurchasePage = () => {
  const { product = '', edition = '' } = useParams();
  const targetProduct = decodeURIComponent(product);
  const targetEdition = decodeURIComponent(edition);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 非空即进入扫码阶段：保存订单号与二维码内容。 */
  const [intent, setIntent] = useState<CheckoutResponse | null>(null);
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [missing, setMissing] = useState(false);
  const [checking, setChecking] = useState(false);

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

  const orderId = intent?.orderId ?? null;

  // 支付宝的异步通知到达后，订单从 PENDING 变为已支付或已关闭。
  useEffect(() => {
    if (!orderId) {
      return undefined;
    }
    return startOrderPolling({
      orderId,
      onOrder: (order) => setStatus(order.status),
      onUnavailable: () => setMissing(true),
    });
  }, [orderId]);

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      const created = await createCheckout({
        product: targetProduct,
        edition: targetEdition,
      });
      setStatus('PENDING');
      setMissing(false);
      setIntent(created);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(CHECKOUT_ERROR_MESSAGES[error.type] ?? error.message);
        if (error.type === 'SubscriptionAlreadyActive') {
          navigate('/licenses');
        }
      } else {
        message.error('下单失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** 买家的显式动作：请后端直接向支付宝确认这笔订单。 */
  const handleConfirmPaid = async () => {
    if (!orderId) {
      return;
    }
    setChecking(true);
    try {
      const order = await checkOrderPayment(orderId);
      setStatus(order.status);
      if (order.status === 'PAID') {
        message.success('支付已确认');
      } else {
        message.info('支付宝尚未确认这笔付款，请完成支付后再试');
      }
    } catch (error) {
      message.error(
        error instanceof ApiError
          ? error.message
          : '暂时无法向支付宝确认，请稍后重试',
      );
    } finally {
      setChecking(false);
    }
  };

  const title = detail ? detail.product.displayName : targetProduct;
  const backToConfirm = useCallback(() => setIntent(null), []);

  if (intent && status === 'PAID') {
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

  if (intent && missing) {
    return (
      <PageContainer title="支付结果">
        <Result
          status="info"
          title="没有待确认的支付"
          subTitle="未找到本次下单的订单信息，请重新下单。"
          extra={
            <Button type="primary" onClick={backToConfirm}>
              重新下单
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (intent && SETTLED_ORDER_STATUSES.includes(status)) {
    return (
      <PageContainer title="支付结果">
        <Result
          status="warning"
          title="支付未完成"
          subTitle="本次订单未完成支付，未开通任何订阅。如已扣款请保留订单号并联系我们。"
          extra={[
            <Button type="primary" key="retry" onClick={backToConfirm}>
              重新下单
            </Button>,
            <Link to="/catalog" key="catalog">
              <Button>返回产品目录</Button>
            </Link>,
          ]}
        />
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
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="应付金额">
                {detail
                  ? formatMoney(detail.edition.priceCents, detail.edition.currency)
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="订单号">
                <Typography.Text copyable>{intent.orderId}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">支付宝扫码</Descriptions.Item>
            </Descriptions>
            <Space direction="vertical" size={12} style={{ width: '100%' }} align="center">
              <QRCodeSVG value={intent.qrCode} size={220} title="支付宝收款二维码" />
              <Typography.Text type="secondary">
                请用支付宝扫描二维码完成付款
              </Typography.Text>
              <Space size={8}>
                <Spin size="small" />
                <Typography.Text type="secondary">
                  正在等待支付结果…
                </Typography.Text>
              </Space>
            </Space>
            <Alert
              type="info"
              showIcon
              message="二维码有有效期，请尽快完成支付；若已过期请重新下单生成新的二维码。"
            />
            <Space>
              <Button
                type="primary"
                loading={checking}
                onClick={() => void handleConfirmPaid()}
              >
                我已支付
              </Button>
              <Button onClick={backToConfirm}>重新下单</Button>
            </Space>
          </Space>
        ) : (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="价格">
                {detail
                  ? formatMoney(detail.edition.priceCents, detail.edition.currency)
                  : '—'}
              </Descriptions.Item>
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
                onClick={() => void handleCheckout()}
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

