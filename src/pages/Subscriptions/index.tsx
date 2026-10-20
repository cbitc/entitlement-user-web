import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deactivateDevice, listLicenses, listSubscriptions } from '@/services/api';
import { displayProductName, useCatalogIndex } from '@/services/catalog';
import { formatInterval, isEntitled, toDate } from '@/services/subscription';
import type {
  Activation,
  LicenseSummary,
  SubscriptionItem,
  SubscriptionSummary,
} from '@/services/types';
import { SubscriptionStatusTag } from './subscriptionStatus';

/** 表格行：一个订阅项。同一订阅的多个产品各占一行。 */
interface SubscriptionRow {
  readonly key: string;
  readonly subscription: SubscriptionSummary;
  readonly item: SubscriptionItem;
}

export const SubscriptionsPage = () => {
  const { message } = App.useApp();
  const index = useCatalogIndex();
  const [rows, setRows] = useState<ReadonlyArray<SubscriptionRow>>([]);
  const [licenses, setLicenses] = useState<ReadonlyMap<string, LicenseSummary>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [deviceRow, setDeviceRow] = useState<SubscriptionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subscriptions, licenseData] = await Promise.all([
        listSubscriptions(),
        listLicenses(),
      ]);
      setLicenses(
        new Map(licenseData.licenses.map((license) => [license.product, license])),
      );
      setRows(
        subscriptions.subscriptions.flatMap((subscription) =>
          subscription.items.map((item) => ({
            key: `${subscription.id}/${item.product}`,
            subscription,
            item,
          })),
        ),
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载订阅失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (row: SubscriptionRow, machineId: string) => {
    try {
      await deactivateDevice({ product: row.item.product, machineId });
      message.success('设备已停用');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '停用失败，请重试');
    }
  };

  const activeLicense = deviceRow ? licenses.get(deviceRow.item.product) ?? null : null;
  const hasFrozen = rows.some((row) => row.subscription.status === 'FROZEN');

  return (
    <PageContainer title="我的订阅">
      {hasFrozen && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="部分订阅已被管理员暂停，权益暂时不可用；如需恢复请联系管理员。"
        />
      )}
      <ProTable<SubscriptionRow>
        rowKey="key"
        search={false}
        options={{ reload: () => void load(), density: false, setting: true }}
        loading={loading}
        dataSource={[...rows]}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: (
            <Empty description="暂无订阅">
              <Link to="/catalog">
                <Button type="primary">浏览产品目录</Button>
              </Link>
            </Empty>
          ),
        }}
        columns={[
          {
            title: '产品',
            width: 200,
            ellipsis: true,
            render: (_: unknown, row: SubscriptionRow) => (
              <Link to="/catalog">
                {displayProductName(index, row.item.product)}
              </Link>
            ),
          },
          {
            title: '版本',
            width: 220,
            render: (_: unknown, row: SubscriptionRow) => (
              <Space size={6} wrap>
                {row.item.kind === 'TRIAL' ? (
                  <Tag color="processing">试用</Tag>
                ) : (
                  <Tag color="geekblue">{formatInterval(row.item.interval)}</Tag>
                )}
                <Typography.Text>{row.item.plan}</Typography.Text>
              </Space>
            ),
          },
          {
            title: '状态',
            width: 200,
            render: (_: unknown, row: SubscriptionRow) => (
              <SubscriptionStatusTag subscription={row.subscription} />
            ),
          },
          {
            title: '订阅周期',
            width: 240,
            render: (_: unknown, row: SubscriptionRow) => (
              <Space direction="vertical" size={0}>
                <Typography.Text>
                  {toDate(row.subscription.periodStart)} ~ {toDate(row.subscription.periodEnd)}
                </Typography.Text>
                {row.subscription.status === 'TRIALING' && row.subscription.trialEnd && (
                  <Typography.Text type="secondary">
                    试用至 {toDate(row.subscription.trialEnd)}
                  </Typography.Text>
                )}
                {row.subscription.status === 'FROZEN' && (
                  <Typography.Text type="secondary">
                    周期仍在计时，{toDate(row.subscription.periodEnd)} 到期
                  </Typography.Text>
                )}
              </Space>
            ),
          },
          {
            title: '激活设备',
            width: 120,
            render: (_: unknown, row: SubscriptionRow) => {
              const license = licenses.get(row.item.product);
              const usable = license && isEntitled(row.subscription);
              return (
                <Typography.Text type={usable ? undefined : 'secondary'}>
                  {usable
                    ? `${license.activations.length} / ${row.item.maxActivations}`
                    : '—'}
                </Typography.Text>
              );
            },
          },
          {
            title: '操作',
            valueType: 'option',
            width: 140,
            render: (_: unknown, row: SubscriptionRow) => {
              const license = licenses.get(row.item.product);
              if (!license || !isEntitled(row.subscription)) {
                return (
                  <Typography.Text type="secondary">
                    {row.subscription.status === 'FROZEN' ? '请联系管理员' : '—'}
                  </Typography.Text>
                );
              }
              return (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setDeviceRow(row)}
                >
                  管理设备
                </Button>
              );
            },
          },
        ]}
      />

      <Drawer
        open={deviceRow !== null}
        onClose={() => setDeviceRow(null)}
        width={760}
        destroyOnClose
        title={
          deviceRow
            ? `${displayProductName(index, deviceRow.item.product)} · ${deviceRow.item.plan}`
            : ''
        }
      >
        {deviceRow && (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="版本">
                {deviceRow.item.plan}（
                {deviceRow.item.kind === 'TRIAL'
                  ? '试用'
                  : formatInterval(deviceRow.item.interval)}
                ）
              </Descriptions.Item>
              <Descriptions.Item label="订阅状态">
                <SubscriptionStatusTag subscription={deviceRow.subscription} />
              </Descriptions.Item>
              <Descriptions.Item label="订阅周期">
                {toDate(deviceRow.subscription.periodStart)} ~{' '}
                {toDate(deviceRow.subscription.periodEnd)}
              </Descriptions.Item>
              <Descriptions.Item label="激活上限">
                {deviceRow.item.maxActivations}
              </Descriptions.Item>
            </Descriptions>

            {activeLicense ? (
              <ProTable<Activation>
                rowKey="machineId"
                headerTitle="激活设备"
                search={false}
                options={false}
                pagination={false}
                dataSource={[...activeLicense.activations]}
                locale={{ emptyText: '暂无激活设备' }}
                columns={[
                  { title: '设备 ID', dataIndex: 'machineId', copyable: true },
                  {
                    title: '激活时间',
                    dataIndex: 'activatedAt',
                    render: (value) => new Date(String(value)).toLocaleString(),
                  },
                  {
                    title: '最近在线',
                    dataIndex: 'lastRefreshedAt',
                    render: (value) => new Date(String(value)).toLocaleString(),
                  },
                  {
                    title: '操作',
                    valueType: 'option',
                    render: (_: unknown, record: Activation) => [
                      <Popconfirm
                        key="deactivate"
                        title="停用此设备？"
                        description="该设备上的软件将退出登录，可随时重新激活。"
                        okText="停用"
                        cancelText="取消"
                        onConfirm={() =>
                          void handleDeactivate(deviceRow, record.machineId)
                        }
                      >
                        <Button type="link" danger size="small">
                          停用此设备
                        </Button>
                      </Popconfirm>,
                    ],
                  },
                ]}
              />
            ) : (
              <Empty description="许可证尚未发放，或已随订阅结束收回" />
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};
