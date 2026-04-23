import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'applicant' },
  {
    path: 'applicant',
    loadComponent: () => import('./applicant-portal/applicant-portal.component').then((m) => m.ApplicantPortalComponent),
    title: 'Applicant DAV Portal'
  },
  {
    path: 'manager',
    loadComponent: () => import('./manager-dashboard/manager-dashboard.component').then((m) => m.ManagerDashboardComponent),
    title: 'Management Dashboard'
  },
  { path: '**', redirectTo: 'applicant' }
];
