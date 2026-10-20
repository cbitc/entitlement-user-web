import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Space, Tag, Typography } from 'antd';
import { listOrders } from '@/services/api';
import { ORDER_STATUS_LABELS } from '@/services/billing';
import {
  displayProductName,
  findCatalogPlan,
  useCatalogIndex,
} from '@/services/catalog';
import { formatInterval } from '@/services/subscription';
import type { OrderSummary } from '@/services/types';
import { formatMoney } from '@/utils/money';

export const OrdersPage = () => {
  const { message } = App.useApp();
  const index = useCatalogIndex();

  return (
    <PageContainer title="我的订单">
      <ProTable<OrderSummary>
        rowKey="orderId"
        search={false}
        options={{ reload: true, density: false, setting: true }}
        pagination={{ pageSize: 10 }}
        request={async () => {
          try {
            const data = await listOrders();
            return { data: [...data.orders], success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : '加载订单失败');
            return { data: [], success: false };
          }
        }}
        locale={{ emptyText: '暂无订单记录' }}
        columns={[
          {
            title: '订单号',
            dataIndex: 'orderId',
            copyable: true,
            ellipsis: true,
            width: 280,
          },
          {
            title: '产品',
            width: 140,
            render: (_: unknown, record: OrderSummary) =>
              displayProductName(index, record.product),
          },
          {
            title: '套餐',
            width: 200,
            render: (_: unknown, record: OrderSummary) => {
              const plan = findCatalogPlan(index, record.product, record.plan);
              return (
                <Space size={6} wrap>
                  {plan && <Tag color="geekblue">{formatInterval(plan.interval)}</Tag>}
                  <Typography.Text>{record.plan}</Typography.Text>
                </Space>
              );
            },
          },
          {
            title: '金额',
            width: 140,
            render: (_: unknown, record: OrderSummary) =>
              formatMoney(record.amountCents, record.currency),
          },
          {
            title: '状态',
            width: 120,
            render: (_: unknown, record: OrderSummary) => {
              const status = ORDER_STATUS_LABELS[record.status];
              return <Tag color={status.color}>{status.text}</Tag>;
            },
          },
          {
            title: '创建时间',
            width: 200,
            render: (_: unknown, record: OrderSummary) =>
              new Date(record.createdAt).toLocaleString(),
          },
          {
            title: '支付截止',
            width: 200,
            render: (_: unknown, record: OrderSummary) => (
              <Typography.Text type={record.status === 'PENDING' ? undefined : 'secondary'}>
                {new Date(record.expiresAt).toLocaleString()}
              </Typography.Text>
            ),
          },
          {
            title: '支付时间',
            width: 200,
            render: (_: unknown, record: OrderSummary) => (
              <Typography.Text type={record.paidAt ? undefined : 'secondary'}>
                {record.paidAt ? new Date(record.paidAt).toLocaleString() : '—'}
              </Typography.Text>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};
