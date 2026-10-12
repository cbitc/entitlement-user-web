import { PageContainer, ProList } from '@ant-design/pro-components';
import { App, Button, Empty, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { listLicenses } from '@/services/api';
import { displayProductName, useProductNames } from '@/services/catalog';
import type { LicenseSummary } from '@/services/types';
import { LicenseStatusTag } from './licenseStatus';

export const LicensesPage = () => {
  const { message } = App.useApp();
  const productNames = useProductNames();

  return (
    <PageContainer title="我的许可证">
      <ProList<LicenseSummary>
        rowKey={(item) => `${item.product}/${item.edition}`}
        request={async () => {
          try {
            const data = await listLicenses();
            return { data: [...data.licenses], success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : '加载许可证失败');
            return { data: [], success: false };
          }
        }}
        metas={{
          title: {
            render: (_, item) => (
              <Link to={`/licenses/${encodeURIComponent(item.product)}/${encodeURIComponent(item.edition)}`}>
                {displayProductName(productNames, item.product)} · {item.edition}
              </Link>
            ),
          },
          description: {
            render: (_, item) => (
              <Typography.Text type="secondary">
                订阅周期：{item.periodStart.slice(0, 10)} ~ {item.periodEnd.slice(0, 10)}
              </Typography.Text>
            ),
          },
          content: {
            render: (_, item) => (
              <Typography.Text>
                激活设备：{item.activations.length} / {item.maxActivations}
              </Typography.Text>
            ),
          },
          extra: {
            render: (_: unknown, item: LicenseSummary) => (
              <Space>
                <LicenseStatusTag license={item} />
                <Link
                  to={`/licenses/${encodeURIComponent(item.product)}/${encodeURIComponent(item.edition)}`}
                >
                  <Button size="small">管理设备</Button>
                </Link>
              </Space>
            ),
          },
        }}
        locale={{
          emptyText: (
            <Empty description="暂无许可证">
              <Link to="/catalog">
                <Button type="primary">浏览产品目录</Button>
              </Link>
            </Empty>
          ),
        }}
      />
    </PageContainer>
  );
};
