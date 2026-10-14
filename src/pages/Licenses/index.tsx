import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Empty, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { listLicenses } from '@/services/api';
import { displayProductName, useProductNames } from '@/services/catalog';
import type { LicenseSummary } from '@/services/types';
import { LicenseStatusTag } from './licenseStatus';

/** 许可证详情页路径（产品/版本需转义）。 */
const detailPath = (item: LicenseSummary) =>
  `/licenses/${encodeURIComponent(item.product)}/${encodeURIComponent(item.edition)}`;

/** 后端返回完整 ISO 时间，列表只展示到日。 */
const toDate = (value: string) => value.slice(0, 10);

export const LicensesPage = () => {
  const { message } = App.useApp();
  const productNames = useProductNames();

  return (
    <PageContainer title="我的许可证">
      <ProTable<LicenseSummary>
        rowKey={(item) => `${item.product}/${item.edition}`}
        search={false}
        options={{ reload: true, density: false, setting: true }}
        pagination={{ pageSize: 10 }}
        request={async () => {
          try {
            const data = await listLicenses();
            return { data: [...data.licenses], success: true };
          } catch (error) {
            message.error(error instanceof Error ? error.message : '加载许可证失败');
            return { data: [], success: false };
          }
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
        columns={[
          {
            title: '产品',
            dataIndex: 'product',
            width: 200,
            ellipsis: true,
            render: (_: unknown, item: LicenseSummary) => (
              <Link to={detailPath(item)}>
                {displayProductName(productNames, item.product)}
              </Link>
            ),
          },
          { title: '版本', dataIndex: 'edition', width: 120 },
          {
            title: '状态',
            width: 120,
            render: (_: unknown, item: LicenseSummary) => (
              <LicenseStatusTag license={item} />
            ),
          },
          {
            title: '订阅周期',
            width: 220,
            render: (_: unknown, item: LicenseSummary) => (
              <Typography.Text>
                {toDate(item.periodStart)} ~ {toDate(item.periodEnd)}
              </Typography.Text>
            ),
          },
          {
            title: '激活设备',
            width: 120,
            render: (_: unknown, item: LicenseSummary) => (
              <Typography.Text>
                {item.activations.length} / {item.maxActivations}
              </Typography.Text>
            ),
          },
          {
            title: '操作',
            valueType: 'option',
            width: 120,
            render: (_: unknown, item: LicenseSummary) => (
              <Link to={detailPath(item)}>
                <Button size="small">管理设备</Button>
              </Link>
            ),
          },
        ]}
      />
    </PageContainer>
  );
};
