import { AppstoreOutlined, LinkOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { App, Avatar, Button, Col, Divider, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listSubscriptions, startTrial } from '@/services/api';
import { loadCatalogIndex, type CatalogIndex } from '@/services/catalog';
import { ApiError } from '@/services/request';
import {
  PLAN_INTERVAL_DAYS,
  PLAN_INTERVALS,
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
      const trial = await startTrial({ product, plan: plan.code });
      message.success(
        `试用已开始，最多可在 ${trial.trialMaxActivations} 台设备上激活`,
      );
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
                    ? '该产品的订阅已被管理员暂停，权益暂不可用；购买会续费或切换版本，如需恢复请联系管理员。'
                    : '你已订阅该产品；再次购买会续费，或把版本切换为所选版本。'}
                </Typography.Paragraph>
              )}
              {!product.coverage.hasPaid && product.coverage.isTrialing && (
                <Typography.Paragraph type="secondary">
                  该产品正在试用中，购买任一付费版本即可转为正式订阅，或切换到其他版本。
                </Typography.Paragraph>
              )}
              <Row gutter={[16, 16]}>
                {product.plans.map((plan) => {
                  const owned = product.coverage.planCodes.has(plan.code);
                  const tagLabel = owned
                    ? product.coverage.isTrialing
                      ? '试用中'
                      : product.coverage.isFrozen
                        ? '已冻结'
                        : '已订阅'
                    : null;
                  const actionLabel = owned
                    ? product.coverage.isTrialing
                      ? '升级为付费'
                      : '续费'
                    : product.coverage.hasPaid || product.coverage.isTrialing
                      ? '切换到此版本'
                      : '订阅';
                  const prices = PLAN_INTERVALS.flatMap((interval) => {
                    const price = plan.prices.find(
                      (item) => item.interval === interval,
                    );
                    return price ? [price] : [];
                  });
                  const trialKeyForPlan = `${product.code}/${plan.code}`;

                  return (
                    <Col
                      key={plan.code}
                      xs={24}
                      sm={12}
                      md={8}
                      style={{ display: 'flex' }}
                    >
                      <ProCard bordered hoverable style={{ width: '100%' }}>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                          <Typography.Title level={4} style={{ margin: 0 }}>
                            {plan.code}
                            {tagLabel && (
                              <Tag
                                color={product.coverage.isFrozen ? 'warning' : 'success'}
                                style={{ marginLeft: 8 }}
                              >
                                {tagLabel}
                              </Tag>
                            )}
                          </Typography.Title>
                          {prices.map((price, index) => (
                            <div key={price.interval}>
                              {index > 0 && (
                                <Divider style={{ margin: '4px 0 12px' }} />
                              )}
                              <Space
                                direction="vertical"
                                size={6}
                                style={{ width: '100%' }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                  }}
                                >
                                  <Tag
                                    color="geekblue"
                                    style={{ marginInlineEnd: 0 }}
                                  >
                                    {formatInterval(price.interval)}
                                  </Tag>
                                  <Typography.Text
                                    strong
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    {formatMoney(price.priceCents, price.currency)}
                                  </Typography.Text>
                                </div>
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  每 {PLAN_INTERVAL_DAYS[price.interval]} 天
                                </Typography.Text>
                                <Link
                                  to={`/purchase/${encodeURIComponent(product.code)}/${encodeURIComponent(plan.code)}/${price.interval}`}
                                >
                                  <Button type="primary">{actionLabel}</Button>
                                </Link>
                              </Space>
                            </div>
                          ))}
                          {plan.trial && (
                            <Space
                              direction="vertical"
                              size={6}
                              style={{ width: '100%' }}
                            >
                              <Divider style={{ margin: '4px 0 8px' }} />
                              <Typography.Text type="secondary">
                                含 {plan.trial.days} 天免费试用，最多{' '}
                                {plan.trial.maxActivations} 台设备
                              </Typography.Text>
                              {!product.coverage.hasOpen && (
                                <Button
                                  icon={<ThunderboltOutlined />}
                                  loading={trialKey === trialKeyForPlan}
                                  onClick={() =>
                                    void handleTrial(product.code, plan)
                                  }
                                >
                                  开始免费试用
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
