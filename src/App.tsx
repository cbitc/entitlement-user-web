import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { BasicLayout } from '@/layouts/BasicLayout';
import { CatalogPage } from '@/pages/Catalog';
import { CheckoutResultPage } from '@/pages/CheckoutResult';
import { LoginPage } from '@/pages/Login';
import { OrdersPage } from '@/pages/Orders';
import { PurchasePage } from '@/pages/Purchase';
import { SubscriptionsPage } from '@/pages/Subscriptions';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <BasicLayout />,
        children: [
          { path: '/', element: <Navigate to="/subscriptions" replace /> },
          { path: '/subscriptions', element: <SubscriptionsPage /> },
          { path: '/catalog', element: <CatalogPage /> },
          { path: '/purchase/:product/:plan/:interval', element: <PurchasePage /> },
          { path: '/checkout/result', element: <CheckoutResultPage /> },
          { path: '/orders', element: <OrdersPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/subscriptions" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
