import { Component, OnDestroy, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { CatalogModalService } from '../../../core/services/catalog-modal.service';
import { CartService } from '../../../core/services/cart.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { Product } from '../../../core/models/product.model';
import { resolveUnitPrice } from '../../../core/utils/pricing.util';
import { SwipeDirective } from '../../directives/swipe.directive';
import { EffectOverlayComponent } from '../effect-overlay/effect-overlay.component';
import {
  adjustLotsForPending,
  expiryBadgeClass,
  expiryLabel,
  fefoAllocationMap,
  fefoShortfall,
  isRealLot,
} from '../../../core/utils/catalog.util';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [DecimalPipe, SwipeDirective, EffectOverlayComponent],
  templateUrl: './product-detail-modal.component.html',
  animations: [
    trigger('effectFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('900ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('backdropAnim', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('220ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('sheetAnim', [
      transition(':enter', [
        animate('420ms ease-out', keyframes([
          style({ opacity: 0, transform: 'translate(-50%, calc(-50% + 40px)) scale(.72)', offset: 0 }),
          style({ opacity: 1, transform: 'translate(-50%, calc(-50% - 10px)) scale(1.05)', offset: 0.58 }),
          style({ transform: 'translate(-50%, calc(-50% + 4px)) scale(.98)', offset: 0.78 }),
          style({ transform: 'translate(-50%, calc(-50% - 3px)) scale(1.01)', offset: 0.9 }),
          style({ transform: 'translate(-50%, -50%) scale(1)', offset: 1 }),
        ])),
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(.55,.06,.68,.19)', keyframes([
          style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0 }),
          style({ opacity: 0, transform: 'translate(-50%, calc(-50% + 24px)) scale(.88)', offset: 1 }),
        ])),
      ]),
    ]),
  ],
})
export class ProductDetailModalComponent implements OnDestroy {
  product: WritableSignal<Product | null>;
  qty: WritableSignal<number>;
  selectedImageIndex: WritableSignal<number>;

  private catalogService = inject(CatalogService);

  showTierEffect = signal(false);
  private effectTimeout?: ReturnType<typeof setTimeout>;

  constructor(public modal: CatalogModalService, private cart: CartService, private empresa: EmpresaService) {
    this.product = this.modal.product;
    this.qty = this.modal.qty;
    this.selectedImageIndex = this.modal.selectedImageIndex;

    effect(() => {
      const p = this.product();
      clearTimeout(this.effectTimeout);
      if (p && p.price_tiers.some(t => t.active)) {
        this.showTierEffect.set(true);
        this.effectTimeout = setTimeout(() => this.showTierEffect.set(false), 3500);
      } else {
        this.showTierEffect.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.effectTimeout);
  }

  lightboxOpen = signal(false);

  lightboxImageUrl = computed(() => {
    const p = this.product();
    if (!p) return null;
    if (p.images.length > 0) return p.images[this.selectedImageIndex()]?.url ?? p.images[0].url;
    return p.primary_image_url ?? null;
  });

  showLotBreakdown = computed(() => this.empresa.info()?.catalog_show_lot_breakdown ?? false);

  private pendingQty       = computed(() => this.catalogService.pendingQtys()[this.product()?.id ?? 0] ?? 0);
  private adjustedLotsInfo = computed(() => adjustLotsForPending(this.product()?.lots_info ?? null, this.pendingQty()));

  avail = computed(() => this.adjustedLotsInfo()?.available_stock ?? 0);

  shortfall = computed(() => {
    const info = this.adjustedLotsInfo();
    return fefoShortfall({ lots_info: info }, this.qty());
  });

  alloc = computed(() => {
    const info = this.adjustedLotsInfo();
    return fefoAllocationMap({ lots_info: info }, this.qty());
  });

  lots = computed(() => (this.adjustedLotsInfo()?.lots ?? []).filter(l => l.available_stock > 0));

  activeTiers = computed(() => (this.product()?.price_tiers ?? []).filter(t => t.active));

  unitPrice = computed(() => {
    const p = this.product();
    return p ? resolveUnitPrice(p, this.qty()) : 0;
  });

  lineTotal = computed(() => this.unitPrice() * this.qty());

  inCart = computed(() => {
    const p = this.product();
    return p ? this.cart.quantityOf(p.id) > 0 : false;
  });

  expiryBadgeClass = expiryBadgeClass;
  expiryLabel = expiryLabel;
  isRealLot = isRealLot;

  openLightbox(): void  { this.lightboxOpen.set(true); }
  closeLightbox(): void { this.lightboxOpen.set(false); }

  close(): void {
    this.lightboxOpen.set(false);
    this.modal.close();
  }

  nextImage(): void {
    const p = this.product();
    if (!p || p.images.length <= 1) return;
    this.modal.selectImage((this.selectedImageIndex() + 1) % p.images.length);
  }

  prevImage(): void {
    const p = this.product();
    if (!p || p.images.length <= 1) return;
    this.modal.selectImage((this.selectedImageIndex() - 1 + p.images.length) % p.images.length);
  }

  confirm(): void {
    const p = this.product();
    const qty = this.qty();
    if (!p || qty <= 0) return;

    if (this.cart.quantityOf(p.id) > 0) {
      this.cart.updateQuantity(p.id, qty);
    } else {
      this.cart.add(p, qty);
    }
    this.modal.close();
  }
}
