import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '@/stores/auth';

/** 路由守卫：无有效会话时跳转登录页，并记录来源地址。 */
export const RequireAuth = (): ReactElement => {
  const location = useLocation();
  if (!authStore.isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  return <Outlet />;
};
