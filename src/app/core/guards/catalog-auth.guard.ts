import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CatalogAuthService } from '../services/catalog-auth.service';

export const catalogAuthGuard: CanActivateFn = () => {
  const auth = inject(CatalogAuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/ingresar']);
};
