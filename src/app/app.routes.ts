import { Routes } from '@angular/router';
import { catalogAuthGuard } from './core/guards/catalog-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./views/catalog/catalog.component').then(m => m.CatalogComponent),
  },
  {
    path: 'ingresar',
    loadComponent: () => import('./views/identify/identify.component').then(m => m.IdentifyComponent),
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./views/account/account.component').then(m => m.AccountComponent),
    canActivate: [catalogAuthGuard],
  },
  {
    path: 'carrito',
    loadComponent: () => import('./views/cart/cart.component').then(m => m.CartComponent),
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./views/orders/orders-list.component').then(m => m.OrdersListComponent),
    canActivate: [catalogAuthGuard],
  },
  {
    path: 'pedidos/:id',
    loadComponent: () => import('./views/orders/order-detail.component').then(m => m.OrderDetailComponent),
    canActivate: [catalogAuthGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
