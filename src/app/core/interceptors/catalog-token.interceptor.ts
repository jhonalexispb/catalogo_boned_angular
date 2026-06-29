import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CatalogAuthService } from '../services/catalog-auth.service';

export const catalogTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(CatalogAuthService);
  const token = auth.token();

  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
