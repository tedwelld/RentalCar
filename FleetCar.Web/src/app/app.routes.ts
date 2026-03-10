import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/landing-page.component').then((m) => m.LandingPageComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'request-access',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/request-access-page.component').then((m) => m.RequestAccessPageComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard-page.component').then((m) => m.DashboardPageComponent)
      },
      {
        path: 'fleet',
        loadComponent: () => import('./pages/fleet-page.component').then((m) => m.FleetPageComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings-page.component').then((m) => m.BookingsPageComponent)
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/payments-page.component').then((m) => m.PaymentsPageComponent)
      },
      {
        path: 'customers',
        canActivate: [roleGuard(['Admin', 'Manager'])],
        loadComponent: () => import('./pages/customers-page.component').then((m) => m.CustomersPageComponent)
      },
      {
        path: 'cashups',
        canActivate: [roleGuard(['Admin', 'Manager', 'Counter', 'FinanceManager'])],
        loadComponent: () => import('./pages/cashups-page.component').then((m) => m.CashupsPageComponent)
      },
      {
        path: 'agents',
        loadComponent: () => import('./pages/agents-page.component').then((m) => m.AgentsPageComponent)
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['Admin', 'Manager', 'FinanceManager'])],
        loadComponent: () => import('./pages/reports-page.component').then((m) => m.ReportsPageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
