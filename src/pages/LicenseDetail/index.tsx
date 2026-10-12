import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { App, Button, Popconfirm, Result, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deactivateDevice, listLicenses } from '@/services/api';
import { displayProductName, useProductNames } from '@/services/catalog';
import type { Activation, LicenseSummary } from '@/services/types';
import { LicenseStatusTag } from '../Licenses/licenseStatus';

export const LicenseDetailPage = () => {
  const { product = '', edition = '' } = useParams();
  const { message } = App.useApp();
  const productNames = useProductNames();
  const [license, setLicense] = useState<LicenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listLicenses();
      const found =
        data.licenses.find(
          (item) => item.product === product && item.edition === edition,
        ) ?? null;
      setLicense(found);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载许可证失败');
    } finally {
      setLoading(false);
    }
  }, [product, edition, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeactivate = async (machineId: string) => {
    try {
      await deactivateDevice({ product, edition, machineId });
      message.success('设备已停用');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '停用失败，请重试');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Spin style={{ display: 'block', margin: '120px auto' }} />
      </PageContainer>
    );
  }

  if (!license) {
    return (
      <PageContainer>
        <Result
          status="404"
          title="未找到该许可证"
          subTitle="它可能已过期或被撤销"
          extra={
            <Link to="/licenses">
              <Button type="primary">返回许可证列表</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`${displayProductName(productNames, license.product)} · ${license.edition}`}
      tags={<LicenseStatusTag license={license} />}
    >
      <ProDescriptions
        column={2}
        style={{ marginBottom: 24 }}
        dataSource={license}
        columns={[
          {
            title: '订阅开始',
            dataIndex: 'periodStart',
            render: (value) => String(value).slice(0, 10),
          },
          {
            title: '订阅结束',
            dataIndex: 'periodEnd',
            render: (value) => String(value).slice(0, 10),
          },
          {
            title: '激活上限',
            dataIndex: 'maxActivations',
          },
          {
            title: '已激活设备',
            render: (_, item) => item.activations.length,
          },
        ]}
      />
      <ProTable<Activation>
        rowKey="machineId"
        headerTitle="激活设备"
        search={false}
        options={false}
        pagination={false}
        dataSource={[...license.activations]}
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
            render: (_, record) => [
              <Popconfirm
                key="deactivate"
                title="停用此设备？"
                description="该设备上的软件将退出登录，可随时重新激活。"
                okText="停用"
                cancelText="取消"
                onConfirm={() => void handleDeactivate(record.machineId)}
              >
                <Button type="link" danger size="small">
                  停用此设备
                </Button>
              </Popconfirm>,
            ],
          },
        ]}
      />
    </PageContainer>
  );
};
