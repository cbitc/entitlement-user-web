import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { BasicLayout } from '@/layouts/BasicLayout';
import { CatalogPage } from '@/pages/Catalog';
import { CheckoutCancelPage } from '@/pages/Checkout/Cancel';
import { CheckoutSuccessPage } from '@/pages/Checkout/Success';
import { LicenseDetailPage } from '@/pages/LicenseDetail';
import { LicensesPage } from '@/pages/Licenses';
import { LoginPage } from '@/pages/Login';
import { OrdersPage } from '@/pages/Orders';
import { PurchasePage } from '@/pages/Purchase';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <BasicLayout />,
        children: [
          { path: '/', element: <Navigate to="/licenses" replace /> },
          { path: '/licenses', element: <LicensesPage /> },
          { path: '/licenses/:product/:edition', element: <LicenseDetailPage /> },
          { path: '/catalog', element: <CatalogPage /> },
          { path: '/purchase/:product/:edition', element: <PurchasePage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/checkout/success', element: <CheckoutSuccessPage /> },
          { path: '/checkout/cancel', element: <CheckoutCancelPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/licenses" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
