import { AppstoreOutlined, LinkOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { App, Avatar, Button, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listSubscriptions, startTrial } from '@/services/api';
import { loadCatalogIndex, type CatalogIndex } from '@/services/catalog';
import { ApiError } from '@/services/request';
import {
  PLAN_INTERVAL_DAYS,
  TRIAL_ERROR_MESSAGES,
  formatInterval,
  productCoverage,
} from '@/services/subscription';
import type {
  CatalogPlan,
  CatalogProduct,
  SubscriptionSummary,
  TrialErrorType,
} from '@/services/types';
import { formatMoney } from '@/utils/money';

interface CatalogCard extends CatalogProduct {
  readonly coverage: ReturnType<typeof productCoverage>;
}

const EMPTY_INDEX: CatalogIndex = {
  products: [],
  productByCode: new Map(),
  planByKey: new Map(),
};

export const CatalogPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [index, setIndex] = useState<CatalogIndex>(EMPTY_INDEX);
  const [subscriptions, setSubscriptions] = useState<ReadonlyArray<SubscriptionSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [trialKey, setTrialKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCatalogIndex(), listSubscriptions()])
      .then(([catalog, data]) => {
        if (cancelled) {
          return;
        }
        setIndex(catalog);
        setSubscriptions(data.subscriptions);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          message.error(error instanceof Error ? error.message : '加载产品目录失败');
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
  }, [message]);

  const handleTrial = async (product: string, plan: CatalogPlan) => {
    const key = `${product}/${plan.code}`;
    setTrialKey(key);
    try {
      await startTrial({ product, plan: plan.code });
      message.success('试用已开始，许可证将在几秒内发放');
      navigate('/subscriptions');
    } catch (error) {
      if (error instanceof ApiError && error.type in TRIAL_ERROR_MESSAGES) {
        message.error(TRIAL_ERROR_MESSAGES[error.type as TrialErrorType]);
      } else {
        message.error(error instanceof Error ? error.message : '试用开通失败，请稍后重试');
      }
    } finally {
      setTrialKey(null);
    }
  };

  const now = Date.now();
  const products: CatalogCard[] = index.products.map((product) => ({
    ...product,
    coverage: productCoverage(subscriptions, product.code, now),
  }));

  return (
    <PageContainer title="产品目录">
      <Spin spinning={loading}>
        {products.length === 0 && !loading ? (
          <Empty description="暂无可订阅的产品" />
        ) : (
          products.map((product) => (
            <ProCard
              key={product.code}
              title={
                <Space size={10}>
                  <Avatar
                    shape="square"
                    size={40}
                    src={product.iconUrl ?? undefined}
                    alt={product.displayName}
                    icon={<AppstoreOutlined />}
                  />
                  <span>{product.displayName}</span>
                </Space>
              }
              bordered
              headerBordered
              style={{ marginBottom: 16 }}
            >
              <Space size={12} wrap style={{ marginBottom: 8 }}>
                {product.vendor && (
                  <Typography.Text type="secondary">{product.vendor}</Typography.Text>
                )}
                {product.websiteUrl && (
                  <Typography.Link href={product.websiteUrl} target="_blank" rel="noreferrer">
                    <LinkOutlined /> 官网
                  </Typography.Link>
                )}
                {product.tags.map((tag) => (
                  <Tag key={tag} color="blue">
                    {tag}
                  </Tag>
                ))}
              </Space>
              {product.description && (
                <Typography.Paragraph type="secondary">
                  {product.description}
                </Typography.Paragraph>
              )}
              {product.coverage.hasPaid && (
                <Typography.Paragraph type="warning">
                  {product.coverage.isFrozen
                    ? '该产品的订阅已被管理员暂停，权益暂不可用；暂停期间无法重复购买，如需恢复请联系管理员。'
                    : '你已订阅该产品。同一产品的月付/年付套餐互为替代，当前订阅结束前无法再次购买。'}
                </Typography.Paragraph>
              )}
              {!product.coverage.hasPaid && product.coverage.isTrialing && (
                <Typography.Paragraph type="secondary">
                  该产品正在试用中，购买任一付费套餐即可立即转为正式订阅。
                </Typography.Paragraph>
              )}
              <Row gutter={[16, 16]}>
                {product.plans.map((plan) => {
                  const key = `${product.code}/${plan.code}`;
                  const owned = product.coverage.planCodes.has(plan.code);
                  const trialAvailable =
                    plan.trialDays > 0 && !product.coverage.hasOpen;
                  const showTag =
                    owned ||
                    product.coverage.hasPaid ||
                    product.coverage.isTrialing;
                  const tagLabel = owned
                    ? product.coverage.isTrialing
                      ? '试用中'
                      : product.coverage.isFrozen
                        ? '已冻结'
                        : '已订阅'
                    : product.coverage.hasPaid
                      ? product.coverage.isFrozen
                        ? '该产品已冻结'
                        : '该产品已订阅'
                      : '该产品试用中';

                  return (
                    <Col key={key} xs={24} sm={12} md={8}>
                      <ProCard bordered hoverable style={{ height: '100%' }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                          <Typography.Title level={4} style={{ margin: 0 }}>
                            {plan.code}
                            {showTag && (
                              <Tag
                                color={product.coverage.isFrozen ? 'warning' : 'success'}
                                style={{ marginLeft: 8 }}
                              >
                                {tagLabel}
                              </Tag>
                            )}
                          </Typography.Title>
                          <Space size={6}>
                            <Tag color="geekblue">{formatInterval(plan.interval)}</Tag>
                            <Typography.Text type="secondary">
                              每 {PLAN_INTERVAL_DAYS[plan.interval]} 天
                            </Typography.Text>
                          </Space>
                          <Typography.Text strong>
                            {formatMoney(plan.priceCents, plan.currency)}
                          </Typography.Text>
                          {plan.trialDays > 0 && (
                            <Typography.Text type="secondary">
                              含 {plan.trialDays} 天免费试用
                            </Typography.Text>
                          )}
                          {product.coverage.hasPaid ? (
                            <Link to="/subscriptions">
                              <Button>查看订阅</Button>
                            </Link>
                          ) : (
                            <Space wrap>
                              <Link
                                to={`/purchase/${encodeURIComponent(product.code)}/${encodeURIComponent(plan.code)}`}
                              >
                                <Button type="primary">
                                  {product.coverage.isTrialing ? '升级为付费' : '订阅'}
                                </Button>
                              </Link>
                              {trialAvailable && (
                                <Button
                                  icon={<ThunderboltOutlined />}
                                  loading={trialKey === key}
                                  onClick={() => void handleTrial(product.code, plan)}
                                >
                                  开始试用
                                </Button>
                              )}
                            </Space>
                          )}
                        </Space>
                      </ProCard>
                    </Col>
                  );
                })}
              </Row>
            </ProCard>
          ))
        )}
      </Spin>
    </PageContainer>
  );
};
