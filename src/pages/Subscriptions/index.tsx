import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelSubscription,
  deactivateDevice,
  listLicenses,
  listSubscriptions,
} from '@/services/api';
import { displayProductName, useCatalogIndex } from '@/services/catalog';
import { ApiError } from '@/services/request';
import {
  CANCEL_ERROR_MESSAGES,
  formatInterval,
  isActiveLike,
  toDate,
} from '@/services/subscription';
import type {
  Activation,
  CancelErrorType,
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
  const [cancelRow, setCancelRow] = useState<SubscriptionRow | null>(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
    },
    [],
  );

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

  const openCancel = (row: SubscriptionRow) => {
    setCancelRow(row);
    // 已申请期末取消的订阅，再操作只可能是「立即取消」。
    setCancelImmediate(row.subscription.cancelAtPeriodEnd);
  };

  const handleCancel = async () => {
    if (!cancelRow) {
      return;
    }
    setCancelling(true);
    try {
      await cancelSubscription({
        subscriptionId: cancelRow.subscription.id,
        immediate: cancelImmediate,
      });
      message.success(
        cancelImmediate
          ? '订阅已立即取消，许可证将随即收回'
          : '已设置为期末取消，当前周期内仍可继续使用',
      );
      setCancelRow(null);
      await load();
      if (cancelImmediate) {
        // 许可证由订阅事件投影异步收回，稍后补一次刷新。
        refreshTimer.current = window.setTimeout(() => void load(), 1_500);
      }
    } catch (error) {
      if (error instanceof ApiError && error.type in CANCEL_ERROR_MESSAGES) {
        message.error(CANCEL_ERROR_MESSAGES[error.type as CancelErrorType]);
      } else {
        message.error(error instanceof Error ? error.message : '取消订阅失败，请稍后重试');
      }
    } finally {
      setCancelling(false);
    }
  };

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

  return (
    <PageContainer title="我的订阅">
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
            title: '套餐',
            width: 220,
            render: (_: unknown, row: SubscriptionRow) => (
              <Space size={6} wrap>
                <Tag color="geekblue">{formatInterval(row.item.interval)}</Tag>
                <Typography.Text>{row.item.plan}</Typography.Text>
              </Space>
            ),
          },
          {
            title: '状态',
            width: 220,
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
              </Space>
            ),
          },
          {
            title: '激活设备',
            width: 120,
            render: (_: unknown, row: SubscriptionRow) => {
              const license = licenses.get(row.item.product);
              const usable = license && isActiveLike(row.subscription);
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
            width: 200,
            render: (_: unknown, row: SubscriptionRow) => {
              const license = licenses.get(row.item.product);
              const manageable = license && isActiveLike(row.subscription);
              return (
                <Space size={4} wrap>
                  {manageable && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setDeviceRow(row)}
                    >
                      管理设备
                    </Button>
                  )}
                  {isActiveLike(row.subscription) && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => openCancel(row)}
                    >
                      {row.subscription.cancelAtPeriodEnd ? '立即取消' : '取消订阅'}
                    </Button>
                  )}
                </Space>
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
              <Descriptions.Item label="套餐">
                {deviceRow.item.plan}（{formatInterval(deviceRow.item.interval)}）
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

      <Modal
        open={cancelRow !== null}
        title={cancelImmediate ? '立即取消订阅' : '取消订阅'}
        okText="确认取消"
        cancelText="返回"
        okButtonProps={{ danger: true, loading: cancelling }}
        onOk={() => void handleCancel()}
        onCancel={() => setCancelRow(null)}
      >
        {cancelRow && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text>
              订阅：{displayProductName(index, cancelRow.item.product)} ·{' '}
              {cancelRow.item.plan}
            </Typography.Text>
            {cancelRow.subscription.items.length > 1 && (
              <Typography.Text type="warning">
                该订阅包含 {cancelRow.subscription.items.length} 个产品，取消将同时影响全部产品。
              </Typography.Text>
            )}
            <Checkbox
              checked={cancelImmediate}
              onChange={(event) => setCancelImmediate(event.target.checked)}
            >
              立即取消（立即失去访问权限，许可证会被收回）
            </Checkbox>
            <Alert
              type={cancelImmediate ? 'warning' : 'info'}
              showIcon
              message={
                cancelImmediate
                  ? '确认后订阅立即结束，已激活的设备将无法继续使用。'
                  : `不勾选时，订阅将在 ${toDate(cancelRow.subscription.periodEnd)} 到期后失效，当前周期内仍可继续使用。`
              }
            />
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};
