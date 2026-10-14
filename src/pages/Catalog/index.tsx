import { AppstoreOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { App, Avatar, Button, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCatalog, listLicenses } from '@/services/api';
import type { CatalogEdition, CatalogProduct } from '@/services/types';
import { formatDuration, formatMoney } from '@/utils/money';

interface EditionCard extends CatalogEdition {
  /** 该产品已有生效订阅：同产品的其它版本也不能再买（后端按产品判定）。 */
  readonly subscribed: boolean;
  /** 用户订阅的正是这一个版本（仅用于区分标签文案）。 */
  readonly owned: boolean;
}

/** 目录产品加上本用户各版本的订阅状态。 */
interface ProductCard extends Omit<CatalogProduct, 'editions'> {
  readonly editions: ReadonlyArray<EditionCard>;
}

export const CatalogPage = () => {
  const { message } = App.useApp();
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCatalog(), listLicenses()])
      .then(([catalog, licenses]) => {
        // 同一产品的月付/年付版本互为替代：任一版本在有效期内，整个产品都
        // 不允许再购买（后端同样按产品判定并返回 409）。
        const active = licenses.licenses.filter(
          (item) => new Date(item.periodEnd).getTime() > Date.now(),
        );
        const activeProducts = new Set(active.map((item) => item.product));
        const ownedEditions = new Set(
          active.map((item) => `${item.product}/${item.edition}`),
        );
        setProducts(
          catalog.products.map((product) => ({
            ...product,
            editions: product.editions.map((edition) => ({
              ...edition,
              subscribed: activeProducts.has(product.code),
              owned: ownedEditions.has(`${product.code}/${edition.code}`),
            })),
          })),
        );
      })
      .catch((error: unknown) => {
        message.error(error instanceof Error ? error.message : '加载产品目录失败');
      })
      .finally(() => setLoading(false));
  }, [message]);

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
              {product.tags.length > 0 && (
                <Space size={[4, 8]} wrap style={{ marginBottom: 8 }}>
                  {product.tags.map((tag) => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              )}
              {product.description && (
                <Typography.Paragraph type="secondary">
                  {product.description}
                </Typography.Paragraph>
              )}
              <Row gutter={[16, 16]}>
                {product.editions.map((card) => (
                  <Col key={`${product.code}/${card.code}`} xs={24} sm={12} md={8}>
                    <ProCard bordered hoverable style={{ height: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }} size={4}>
                        <Typography.Title level={4} style={{ margin: 0 }}>
                          {card.code}
                          {card.subscribed && (
                            <Tag color="success" style={{ marginLeft: 8 }}>
                              {card.owned ? '已订阅' : '该产品已订阅'}
                            </Tag>
                          )}
                        </Typography.Title>
                        <Typography.Text strong>
                          {formatMoney(card.priceCents, card.currency)}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          有效期 {formatDuration(card.durationDays)}
                        </Typography.Text>
                        {card.subscribed ? (
                          <Link to="/licenses">
                            <Button>查看许可证</Button>
                          </Link>
                        ) : (
                          <Link
                            to={`/purchase/${encodeURIComponent(product.code)}/${encodeURIComponent(card.code)}`}
                          >
                            <Button type="primary">订阅</Button>
                          </Link>
                        )}
                      </Space>
                    </ProCard>
                  </Col>
                ))}
              </Row>
            </ProCard>
          ))
        )}
      </Spin>
    </PageContainer>
  );
};
