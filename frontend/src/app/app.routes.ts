import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './auth.guards';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'applicant' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Sign in'
  },
  {
    path: 'applicant',
    canActivate: [authGuard, roleGuard('applicant')],
    loadComponent: () => import('./applicant-portal/applicant-portal.component').then((m) => m.ApplicantPortalComponent),
    title: 'Applicant DAV Portal'
  },
  {
    path: 'manager',
    canActivate: [authGuard, roleGuard('manager')],
    loadComponent: () => import('./manager-dashboard/manager-dashboard.component').then((m) => m.ManagerDashboardComponent),
    title: 'Management Dashboard'
  },
  { path: '**', redirectTo: 'applicant' }
];
