import { Component, OnInit, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { CatalogAuthService } from '../../core/services/catalog-auth.service';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { getGreeting } from '../../core/utils/greeting.util';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, NgClass],
  templateUrl: './account.component.html',
})
export class AccountComponent implements OnInit {
  loading = signal(true);
  recommendations = signal<Product[]>([]);

  greeting  = computed(() => getGreeting());
  skyClass  = computed(() => {
    const p = this.greeting().period;
    return p === 'morning' ? 'sky--morning' : p === 'afternoon' ? 'sky--afternoon' : 'sky--night';
  });

  constructor(
    public auth: CatalogAuthService,
    private catalogService: CatalogService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.catalogService.me().subscribe({
      next: res => {
        const pendingQtys = this.catalogService.pendingQtys();
        const visible = (res.recommendations ?? []).filter(p => {
          if (p.lots_info === null) return true;
          return (p.lots_info?.available_stock ?? 0) - (pendingQtys[p.id] ?? 0) > 0;
        });
        this.recommendations.set(visible);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  logout(): void {
    this.auth.transition.set('logout');
    setTimeout(() => {
      this.auth.logout();
      this.auth.transition.set(null);
      this.router.navigate(['/']);
    }, 1000);
  }
}
