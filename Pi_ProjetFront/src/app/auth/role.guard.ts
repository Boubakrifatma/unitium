import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows only MANAGER and TUTOR roles; redirects everyone else to /app/chat. */
export const roleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const role = authService.currentUser()?.role;
  if (role === 'MANAGER' || role === 'TUTOR') return true;
  return router.createUrlTree(['/app/chat']);
};
