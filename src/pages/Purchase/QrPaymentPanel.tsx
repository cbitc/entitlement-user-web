import { Alert, Button, Descriptions, Space, Spin, Typography } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import type { CheckoutResponse } from '@/services/types';

interface QrPaymentPanelProps {
  readonly intent: CheckoutResponse;
  /** 已格式化的应付金额。 */
  readonly amountLabel: string;
  /** 支付窗口截止时间（ISO）；尚未拿到订单时为 null。 */
  readonly expiresAt: string | null;
  readonly onReset: () => void;
}

/**
 * 扫码支付面板：展示订单信息与支付宝二维码。
 *
 * 付款确认完全由后端完成，本页不做任何跳转，也没有「我已支付」这类主动
 * 核对按钮——只提示买家付款并等待页面自动更新。支付截止时间来自订单
 * 读模型，到点后页面会切换到二维码失效结果。
 */
export const QrPaymentPanel = ({
  intent,
  amountLabel,
  expiresAt,
  onReset,
}: QrPaymentPanelProps) => (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="应付金额">{amountLabel}</Descriptions.Item>
      <Descriptions.Item label="订单号">
        <Typography.Text copyable>{intent.orderId}</Typography.Text>
      </Descriptions.Item>
      {expiresAt && (
        <Descriptions.Item label="支付截止">
          {new Date(expiresAt).toLocaleString()}
        </Descriptions.Item>
      )}
      <Descriptions.Item label="支付方式">支付宝扫码</Descriptions.Item>
    </Descriptions>

    <Space
      direction="vertical"
      size={12}
      style={{ width: '100%' }}
      align="center"
    >
      <QRCodeSVG value={intent.qrCode} size={220} title="支付宝收款二维码" />
      <Typography.Text type="secondary">
        请用支付宝扫描二维码完成付款
      </Typography.Text>
      <Space size={8}>
        <Spin size="small" />
        <Typography.Text type="secondary">正在等待支付结果…</Typography.Text>
      </Space>
    </Space>

    <Alert
      type="info"
      showIcon
      message="支付完成后本页会自动更新，请勿关闭页面。二维码在支付截止时间后失效，若已过期请重新下单生成新的二维码。"
    />

    <Space>
      <Button onClick={onReset}>重新下单</Button>
    </Space>
  </Space>
);
