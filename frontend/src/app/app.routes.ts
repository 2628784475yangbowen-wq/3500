import { Routes } from '@angular/router';
import { ApplicantPortalComponent } from './applicant-portal/applicant-portal.component';
import { ManagerDashboardComponent } from './manager-dashboard/manager-dashboard.component';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'applicant' },
  {
    path: 'applicant',
    component: ApplicantPortalComponent,
    title: 'Applicant DAV Portal'
  },
  {
    path: 'manager',
    component: ManagerDashboardComponent,
    title: 'Management Dashboard'
  },
  { path: '**', redirectTo: 'applicant' }
];
