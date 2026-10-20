import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { App, Button, Typography } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestLogin, verifyLogin } from '@/services/api';
import { ApiError } from '@/services/request';
import { useAuth } from '@/stores/useAuth';

const RESEND_SECONDS = 60;

/** 后端错误类型 → 中文提示。 */
const ERROR_MESSAGES: Record<string, string> = {
  RateLimitExceeded: '验证码发送过于频繁，请稍后再试',
  NotFound: '请先获取验证码',
  Expired: '验证码已过期，请重新获取',
  VerificationLimitExceeded: '验证次数过多，请重新获取验证码',
  AuthFailed: '验证码错误',
};

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError
    ? (ERROR_MESSAGES[error.type] ?? error.message)
    : fallback;

export const LoginPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  const sendCode = async (target: string) => {
    setSending(true);
    try {
      const res = await requestLogin(target);
      setEmail(target);
      setExpiresAt(res.expiresAt);
      setCountdown(RESEND_SECONDS);
      const timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      message.success(`验证码已发送至 ${res.email}`);
    } catch (error) {
      message.error(toMessage(error, '验证码发送失败，请稍后重试'));
      throw error;
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async (values: { email: string; code?: string }) => {
    try {
      if (!email) {
        await sendCode(values.email);
        return;
      }
      const res = await verifyLogin(email, values.code ?? '');
      login(res.token);
      const from = (location.state as { from?: string } | null)?.from ?? '/subscriptions';
      navigate(from, { replace: true });
    } catch (error) {
      message.error(toMessage(error, '登录失败，请重试'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <LoginForm
        title="订阅中心"
        subTitle="使用邮箱验证码登录，管理你的订阅与设备"
        submitter={{
          searchConfig: { submitText: email ? '登录' : '获取验证码' },
        }}
        onFinish={handleFinish}
      >
        <ProFormText
          name="email"
          fieldProps={{ size: 'large', prefix: <MailOutlined />, disabled: !!email }}
          placeholder="邮箱地址"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        />
        {email && (
          <>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              验证码已发送，{expiresAt ? `有效期至 ${new Date(expiresAt).toLocaleTimeString()}` : ''}
              <Button
                type="link"
                size="small"
                onClick={() => setEmail(null)}
                style={{ paddingLeft: 8 }}
              >
                更换邮箱
              </Button>
            </Typography.Paragraph>
            <ProFormText
              name="code"
              fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
              placeholder="6 位验证码"
              rules={[{ required: true, message: '请输入验证码' }]}
              addonAfter={
                <Button
                  type="link"
                  size="small"
                  loading={sending}
                  disabled={countdown > 0}
                  onClick={() => void sendCode(email)}
                >
                  {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
                </Button>
              }
            />
          </>
        )}
      </LoginForm>
    </div>
  );
};
