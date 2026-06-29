import { Component, computed, effect, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { EmpresaService } from './core/services/empresa.service';
import { CatalogAuthService } from './core/services/catalog-auth.service';
import { CatalogService } from './core/services/catalog.service';
import { getGreeting } from './core/utils/greeting.util';
import { CartService } from './core/services/cart.service';
import { ThemeService } from './core/services/theme.service';
import { BrandColorService, BRAND_COLOR_PRESETS } from './core/services/brand-color.service';
import { ProductDetailModalComponent } from './shared/components/product-detail-modal/product-detail-modal.component';
import { EventModalComponent } from './shared/components/event-modal/event-modal.component';
import { CatalogAccessModalComponent } from './shared/components/catalog-access-modal/catalog-access-modal.component';
import { OffersModalComponent } from './shared/components/offers-modal/offers-modal.component';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ProductDetailModalComponent, EventModalComponent, CatalogAccessModalComponent, OffersModalComponent, LoadingScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  colorPickerOpen = signal(false);
  brandPresets = BRAND_COLOR_PRESETS;
  currentUrl = signal('');

  greetingText = computed(() => {
    if (this.currentUrl() === '/cuenta') return '';
    const salutation = getGreeting().salutation;
    if (!this.auth.isLoggedIn()) return salutation;
    const client = this.auth.client();
    const name = client?.business_name || client?.name;
    return name ? `${salutation}, ${name}` : salutation;
  });

  constructor(
    public auth: CatalogAuthService,
    public cart: CartService,
    public theme: ThemeService,
    public brand: BrandColorService,
    public empresa: EmpresaService,
    private catalog: CatalogService,
    private title: Title,
    private meta: Meta,
    private router: Router,
  ) {
    this.catalog.trackVisit();
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });

    effect(() => {
      const info = this.empresa.info();

      if (!info) {
        this.title.setTitle('Cargando...');
        this.setFavicon('data:,');
        return;
      }

      const name = info.nombre_comercial || info.razon_social || 'Catálogo';
      this.title.setTitle(name);
      this.meta.updateTag({ property: 'og:title', content: name });
      this.meta.updateTag({ name: 'description', content: `Catálogo de productos de ${name}. Consulta precios, promociones y haz tu pedido.` });
      this.meta.updateTag({ property: 'og:description', content: `Catálogo de productos de ${name}. Consulta precios, promociones y haz tu pedido.` });

      if (info.logo_url) {
        this.setFavicon(info.logo_url);
        this.meta.updateTag({ property: 'og:image', content: info.logo_url });
      }
    });

    effect(() => {
      this.meta.updateTag({ name: 'theme-color', content: this.brand.color() });
    });
  }

  private setFavicon(url: string): void {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  toggleColorPicker(): void {
    this.colorPickerOpen.update(v => !v);
  }

  selectColor(hex: string): void {
    this.brand.setColor(hex);
    this.colorPickerOpen.set(false);
  }

  onCustomColor(value: string): void {
    this.brand.setColor(value);
  }
}
