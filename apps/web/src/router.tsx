import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';

import App from './App';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { PolicyDashboardPage } from './pages/PolicyDashboardPage';
import { PolicyViewPage } from './pages/PolicyViewPage';

const rootRoute = createRootRoute({
  component: App,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ChatPage,
});

const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies',
  beforeLoad: () => {
    const token = localStorage.getItem('rag-demo-token');
    let isAdmin = false;
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
        isAdmin = payload.role === 'admin';
      }
    } catch { /* malformed token */ }
    if (!isAdmin) {
      throw redirect({ to: '/' });
    }
  },
  component: PolicyDashboardPage,
});

const policyViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/policies/view/$policyId',
  component: () => <PolicyViewPage />,
});

const routeTree = rootRoute.addChildren([loginRoute, indexRoute, policiesRoute, policyViewRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
