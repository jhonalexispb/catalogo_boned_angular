import { Component, AfterViewInit, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalog.service';
import { CategoryOrders, Product, ProductLaboratory } from '../../core/models/product.model';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { readableTextColor } from '../../core/utils/catalog.util';
import { CatalogAppearanceService } from '../../core/services/catalog-appearance.service';
import { CatalogModalService } from '../../core/services/catalog-modal.service';
import { CatalogAuthService } from '../../core/services/catalog-auth.service';
import { BannerCarouselComponent } from '../../shared/components/banner-carousel/banner-carousel.component';
import { LoadingScreenComponent } from '../../shared/components/loading-screen/loading-screen.component';
import { CatalogBannerPublic } from '../../core/models/catalog-appearance.model';

const MIN_LOADING_MS  = 2500;
const SCROLL_THRESHOLD = 2000; // px antes del final para disparar precarga anticipada

interface CategoryGroup {
  catName: string;
  catColor: string | null;
  items: Product[];
}

interface LabGroup {
  labId: number;
  labName: string;
  labLogoUrl: string | null;
  labBannerUrl: string | null;
  categories: CategoryGroup[];
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, ProductCardComponent, BannerCarouselComponent, LoadingScreenComponent],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('labsPillsDesktop') labsPillsDesktopRef?: ElementRef<HTMLDivElement>;
  @ViewChild('labsPillsMobile')  labsPillsMobileRef?: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  private get labsPillsRef(): ElementRef<HTMLDivElement> | undefined {
    return this.labsPillsDesktopRef ?? this.labsPillsMobileRef;
  }
  loading       = signal(true);
  isFirstLoad   = signal(true);
  error         = signal('');
  showBackToTop  = signal(false);

  // Productos acumulados (scroll paginado)
  products       = signal<Product[]>([]);
  categoryOrders = signal<CategoryOrders>({});
  private productIdSet = new Set<number>();

  // Paginación para scroll
  private currentPage       = 1;
  private hasMorePages      = true;
  private scrollLoadCooldown = 0;
  loadingMore = signal(false);

  // Búsqueda: usa signal separado, no pisa los productos del scroll
  search        = signal('');
  searchLoading = signal(false);
  searchResults = signal<Product[] | null>(null);

  // Labs
  labsAll      = signal<ProductLaboratory[]>([]);
  loadingLabId = signal<number | null>(null); // pill con spinner
  activeLabId  = signal<number | null>(null); // lab visible en pantalla

  searchOpen       = signal(false);
  bannerNavigating = signal(false);

  private loadStart = 0;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(
    private catalogService: CatalogService,
    private auth: CatalogAuthService,
    public appearance: CatalogAppearanceService,
    private catalogModal: CatalogModalService,
  ) {}

  retry(): void {
    this.error.set('');
    this.products.set([]);
    this.productIdSet.clear();
    this.currentPage  = 1;
    this.hasMorePages = true;
    this.isFirstLoad.set(true);
    this.loadStart = Date.now();
    this.loadPage(1, true);
  }

  ngOnInit(): void {
    const wasLoaded = this.catalogService.hasLoadedCatalog;
    this.isFirstLoad.set(!wasLoaded);
    this.loadStart = Date.now();

    // Labs metadata + primera página en paralelo
    this.catalogService.getLabs().subscribe({
      next: res => this.labsAll.set(res.labs),
      error: () => {},
    });

    if (this.auth.isLoggedIn()) {
      this.catalogService.loadPendingQuantities();
    }

    this.loadPage(1, true);
    window.addEventListener('scroll', this.onScroll);
  }

  ngAfterViewInit(): void {
    const el = this.labsPillsRef?.nativeElement;
    if (el) {
      el.addEventListener('wheel', (e: WheelEvent) => {
        if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
      }, { passive: false });
    }
  }

  scrollLabsLeft(): void {
    this.labsPillsRef?.nativeElement.scrollBy({ left: -220, behavior: 'smooth' });
  }

  scrollLabsRight(): void {
    this.labsPillsRef?.nativeElement.scrollBy({ left: 220, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    clearTimeout(this.searchDebounce);
  }

  // ── Scroll paginado ──────────────────────────────────────────────────────

  private loadPage(page: number, isFirst = false): void {
    if (!isFirst) this.loadingMore.set(true);

    this.catalogService.browse({ per_page: 50, page }).subscribe({
      next: res => {
        this.mergeProducts(res.data);
        this.categoryOrders.update(co => ({ ...co, ...(res.category_orders ?? {}) }));
        this.currentPage  = res.meta.current_page + 1;
        this.hasMorePages = res.meta.current_page < res.meta.last_page;
        this.catalogService.hasLoadedCatalog = true;

        if (isFirst) {
          this.finishFirstLoad();
        } else {
          this.scrollLoadCooldown = Date.now() + 500;
          this.loadingMore.set(false);
        }

        setTimeout(() => this.updateActiveLab(), 150);
      },
      error: () => {
        if (isFirst) {
          this.error.set('No se pudo cargar el catálogo. Intenta nuevamente más tarde.');
          this.loading.set(false);
        } else {
          this.scrollLoadCooldown = Date.now() + 500;
          this.loadingMore.set(false);
        }
      },
    });
  }

  private finishFirstLoad(): void {
    if (this.isFirstLoad()) {
      const remaining = MIN_LOADING_MS - (Date.now() - this.loadStart);
      setTimeout(() => this.loading.set(false), Math.max(0, remaining));
    } else {
      this.loading.set(false);
    }
  }

  private mergeProducts(incoming: Product[]): void {
    const newOnes = incoming.filter(p => !this.productIdSet.has(p.id));
    newOnes.forEach(p => this.productIdSet.add(p.id));
    if (newOnes.length) this.products.update(ps => [...ps, ...newOnes]);
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────────

  onSearchChange(q: string): void {
    this.search.set(q);
    clearTimeout(this.searchDebounce);

    if (!q.trim()) {
      this.searchResults.set(null);
      this.searchLoading.set(false);
      return;
    }

    this.searchLoading.set(true);
    this.searchDebounce = setTimeout(() => {
      this.catalogService.browse({ search: q.trim(), per_page: 200 }).subscribe({
        next: res => {
          this.searchResults.set(res.data);
          this.categoryOrders.update(co => ({ ...co, ...(res.category_orders ?? {}) }));
          this.searchLoading.set(false);
          window.scrollTo({ top: 0, behavior: 'instant' });
        },
        error: () => this.searchLoading.set(false),
      });
    }, 350);
  }

  // ── Click en pill: una sola request con todos los labs hasta el objetivo ──

  clickLab(labId: number): void {
    this.searchOpen.set(false);
    if (this.search()) {
      this.search.set('');
      clearTimeout(this.searchDebounce);
      this.searchResults.set(null);
    }

    // Si ya hay productos de ese lab en pantalla, scroll directo
    if (this.productIdSet.size > 0 && this.groupedCatalog().some(g => g.labId === labId)) {
      this.scrollToLab(labId);
      return;
    }

    if (this.loadingLabId() !== null) return;

    // Recopilar IDs de todos los labs hasta el objetivo (en orden)
    const labs      = this.labsAll();
    const targetIdx = labs.findIndex(l => l.id === labId);
    if (targetIdx === -1) return;

    const labIds = labs.slice(0, targetIdx + 1).map(l => l.id);

    this.loadingLabId.set(labId);
    this.loadLabBatch(labIds, 1, labId);
  }

  private loadLabBatch(labIds: number[], page: number, scrollToId: number): void {
    this.catalogService.browse({ lab_ids: labIds, per_page: 500, page }).subscribe({
      next: res => {
        this.mergeProducts(res.data);
        this.categoryOrders.update(co => ({ ...co, ...(res.category_orders ?? {}) }));

        const hasNext = res.meta.current_page < res.meta.last_page;
        if (hasNext && page < 2) {
          // Máx 2 requests para el click (según lo acordado)
          this.loadLabBatch(labIds, page + 1, scrollToId);
        } else {
          // Avanzar paginación principal saltando las páginas que ya cubre el batch
          // (los productos están ordenados igual, así que size/50 estima las páginas cubiertas)
          const estimatedNextPage = Math.ceil(this.productIdSet.size / 50) + 1;
          if (estimatedNextPage > this.currentPage) {
            this.currentPage = estimatedNextPage;
          }
          this.loadingLabId.set(null);
          setTimeout(() => this.scrollToLab(scrollToId), 80);
        }
      },
      error: () => this.loadingLabId.set(null),
    });
  }

  private scrollToLab(labId: number): void {
    document.getElementById('lab-' + labId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Scroll ───────────────────────────────────────────────────────────────

  private onScroll = (): void => {
    const y = window.scrollY;

    this.showBackToTop.set(y > 400);
    this.updateActiveLab();

    // Cargar siguiente página al acercarse al final (solo en modo normal, no búsqueda)
    if (!this.loadingMore() && !this.loading() && this.hasMorePages && !this.search() && Date.now() > this.scrollLoadCooldown) {
      const scrollBottom = window.scrollY + window.innerHeight;
      const threshold    = document.documentElement.scrollHeight - SCROLL_THRESHOLD;
      if (scrollBottom >= threshold) {
        this.loadPage(this.currentPage);
      }
    }
  };

  openSearch(): void {
    this.searchOpen.set(true);
    setTimeout(() => {
      this.searchInputRef?.nativeElement.focus();
      const activePill = document.querySelector<HTMLElement>(`[data-lab-pill="${this.activeLabId()}"]`);
      activePill?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }, 50);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Pill activo (el lab visible en pantalla) ──────────────────────────────

  private updateActiveLab(): void {
    const groups = this.groupedCatalog();
    if (!groups.length) return;

    let newActiveId = groups[0].labId;
    for (const lab of groups) {
      const el = document.getElementById('lab-' + lab.labId);
      if (el && el.getBoundingClientRect().top <= 160) {
        newActiveId = lab.labId;
      }
    }

    if (newActiveId !== this.activeLabId()) {
      this.activeLabId.set(newActiveId);
      setTimeout(() => {
        const pill = document.querySelector<HTMLElement>(`[data-lab-pill="${newActiveId}"]`);
        pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }
  }

  // ── Agrupado ─────────────────────────────────────────────────────────────

  groupedCatalog = computed<LabGroup[]>(() => {
    const source = this.searchResults() ?? this.products();

    type RawGroup = {
      labId: number; labName: string; labOrder: number;
      labLogoUrl: string | null; labBannerUrl: string | null;
      categories: Map<string, {
        catId: number; catName: string; catOrder: number; catColor: string | null; items: Product[];
      }>;
    };

    const pendingQtys = this.catalogService.pendingQtys();

    const labMap = new Map<number, RawGroup>();
    for (const product of source) {
      // Ocultar productos cuyo stock ajustado (descontando pedidos activos) sea 0
      if (product.lots_info !== null) {
        const adjusted = (product.lots_info?.available_stock ?? 0) - (pendingQtys[product.id] ?? 0);
        if (adjusted <= 0) continue;
      }

      const labId       = product.laboratory?.id ?? 0;
      const labName     = product.laboratory?.name ?? 'Otros';
      const labOrder    = product.laboratory?.sort_order ?? 0;
      const labLogoUrl  = product.laboratory?.logo_url ?? null;
      const labBannerUrl = product.laboratory?.banner_url ?? null;
      const catId    = product.category?.id ?? 0;
      const catName  = product.category?.name ?? 'Otros';
      const catOrder = product.category?.sort_order ?? 0;
      const catColor = product.category?.color ?? null;

      if (!labMap.has(labId)) {
        labMap.set(labId, { labId, labName, labOrder, labLogoUrl, labBannerUrl, categories: new Map() });
      }
      const lab = labMap.get(labId)!;
      if (!lab.categories.has(catName)) {
        lab.categories.set(catName, { catId, catName, catOrder, catColor, items: [] });
      }
      lab.categories.get(catName)!.items.push(product);
    }

    const categoryOrders = this.categoryOrders();

    return [...labMap.values()]
      .sort((a, b) => a.labOrder - b.labOrder || a.labName.localeCompare(b.labName))
      .map(lab => {
        const override = categoryOrders[lab.labId];
        return {
          labId: lab.labId,
          labName: lab.labName,
          labLogoUrl: lab.labLogoUrl,
          labBannerUrl: lab.labBannerUrl,
          categories: [...lab.categories.values()]
            .sort((a, b) => {
              const oA = override ? (override[a.catId] ?? Number.MAX_SAFE_INTEGER) : a.catOrder;
              const oB = override ? (override[b.catId] ?? Number.MAX_SAFE_INTEGER) : b.catOrder;
              return oA - oB || a.catName.localeCompare(b.catName);
            })
            .map(cat => ({
              catName: cat.catName,
              catColor: cat.catColor,
              items: [...cat.items].sort((a, b) =>
                (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
              ),
            })),
        };
      });
  });

  readableTextColor = readableTextColor;

  onBannerClick(banner: CatalogBannerPublic): void {
    if (!banner.product_id) return;

    const found = this.products().find(p => p.id === banner.product_id);
    if (found) {
      if ((found.lots_info?.available_stock ?? 0) <= 0) {
        import('sweetalert2').then(({ default: Swal }) =>
          Swal.fire({ icon: 'warning', title: 'Promoción agotada', text: 'Este producto ya no tiene stock disponible.', confirmButtonText: 'Entendido' })
        );
        return;
      }
      this.catalogModal.open(found);
      return;
    }

    // No está cargado: mostrar pantalla de carga mientras se trae del servidor
    this.bannerNavigating.set(true);
    this.catalogService.browse({ product_id: banner.product_id, per_page: 1 }).subscribe({
      next: res => {
        this.bannerNavigating.set(false);
        const p = res.data[0];
        if (!p || (p.lots_info?.available_stock ?? 0) <= 0) {
          import('sweetalert2').then(({ default: Swal }) =>
            Swal.fire({ icon: 'warning', title: 'Promoción agotada', text: 'Este producto ya no tiene stock disponible.', confirmButtonText: 'Entendido' })
          );
          return;
        }
        this.mergeProducts([p]);
        this.catalogModal.open(p);
      },
      error: () => {
        this.bannerNavigating.set(false);
        import('sweetalert2').then(({ default: Swal }) =>
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el producto.', confirmButtonText: 'Cerrar' })
        );
      },
    });
  }
}
