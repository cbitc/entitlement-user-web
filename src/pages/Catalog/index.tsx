import { PageContainer, ProCard } from '@ant-design/pro-components';
import { App, Button, Empty, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCatalog, listLicenses } from '@/services/api';
import type { CatalogEdition } from '@/services/types';
import { formatDuration, formatMoney } from '@/utils/money';

interface EditionCard extends CatalogEdition {
  readonly subscribed: boolean;
}

interface ProductGroup {
  readonly product: string;
  readonly editions: EditionCard[];
}

export const CatalogPage = () => {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCatalog(), listLicenses()])
      .then(([catalog, licenses]) => {
        // 已生效订阅的版本不再允许重复购买（后端也会返回 409）。
        const activeKeys = new Set(
          licenses.licenses
            .filter((item) => new Date(item.periodEnd).getTime() > Date.now())
            .map((item) => `${item.product}/${item.edition}`),
        );
        const byProduct = new Map<string, EditionCard[]>();
        catalog.editions.forEach((item) => {
          const list = byProduct.get(item.product) ?? [];
          list.push({
            ...item,
            subscribed: activeKeys.has(`${item.product}/${item.edition}`),
          });
          byProduct.set(item.product, list);
        });
        setGroups(
          [...byProduct.entries()].map(([product, editions]) => ({
            product,
            editions,
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
        {groups.length === 0 && !loading ? (
          <Empty description="暂无可订阅的产品" />
        ) : (
          groups.map((group) => (
            <ProCard key={group.product} title={group.product} gutter={[16, 16]} wrap>
              {group.editions.map((card) => (
                <ProCard
                  key={`${group.product}/${card.edition}`}
                  colSpan={{ xs: 24, sm: 12, md: 8 }}
                  bordered
                  hoverable
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {card.edition}
                      {card.subscribed && (
                        <Tag color="success" style={{ marginLeft: 8 }}>
                          已订阅
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
                        to={`/purchase/${encodeURIComponent(group.product)}/${encodeURIComponent(card.edition)}`}
                      >
                        <Button type="primary">订阅</Button>
                      </Link>
                    )}
                  </Space>
                </ProCard>
              ))}
            </ProCard>
          ))
        )}
      </Spin>
    </PageContainer>
  );
};
