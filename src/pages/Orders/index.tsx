import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Tag, Typography } from 'antd';
import { listOrders } from '@/services/api';
import { ORDER_STATUS_LABELS } from '@/services/billing';
import type { OrderSummary } from '@/services/types';
import { formatMoney } from '@/utils/money';

export const OrdersPage = () => {
  const { message } = App.useApp();

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
          { title: '产品', dataIndex: 'product', width: 140 },
          { title: '版本', dataIndex: 'edition', width: 140 },
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
            title: '支付时间',
            width: 200,
            render: (_: unknown, record: OrderSummary) => (
              <Typography.Text type={record.paidAt ? undefined : 'secondary'}>
                {record.paidAt
                  ? new Date(record.paidAt).toLocaleString()
                  : '—'}
              </Typography.Text>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};
