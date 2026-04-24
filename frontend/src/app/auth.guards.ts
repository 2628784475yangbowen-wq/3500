import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/login');
  return false;
};

export const roleGuard = (role: 'applicant' | 'manager'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (!user) {
    router.navigateByUrl('/login');
    return false;
  }
  if (user.role !== role) {
    router.navigateByUrl(user.role === 'manager' ? '/manager' : '/applicant');
    return false;
  }
  return true;
};
