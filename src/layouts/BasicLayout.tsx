import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import { Dropdown, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/useAuth';

/** 门户骨架：ProLayout 提供菜单、页头与用户区。 */
export const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, logout } = useAuth();
  const { token } = theme.useToken();

  return (
    <ProLayout
      title="订阅中心"
      logo={false}
      fixSiderbar
      layout="mix"
      token={{ header: { colorBgHeader: token.colorBgContainer } }}
      location={{ pathname: location.pathname }}
      route={{
        path: '/',
        routes: [
          { path: '/licenses', name: '我的许可证' },
          { path: '/catalog', name: '产品目录' },
          { path: '/orders', name: '我的订单' },
        ],
      }}
      menuItemRender={(item, dom) => (
        <a onClick={() => item.path && navigate(item.path)}>{dom}</a>
      )}
      avatarProps={{
        icon: <UserOutlined />,
        size: 'small',
        render: (_, dom) => (
          <Dropdown
            menu={{
              items: [
                { key: 'email', label: email ?? '-', disabled: true },
                { type: 'divider' },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: () => {
                    logout();
                    navigate('/login', { replace: true });
                  },
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
};
