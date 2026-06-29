import { Component, Input, computed, effect, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogModalService } from '../../../core/services/catalog-modal.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { resolveUnitPrice } from '../../../core/utils/pricing.util';
import {
  adjustLotsForPending,
  appliedTierLabel,
  expiryBadgeClass,
  expiryLabel,
  hasActiveTiers,
} from '../../../core/utils/catalog.util';
import { showStockAlert } from '../../../core/utils/alert.util';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  private catalogService = inject(CatalogService);

  constructor(private cart: CartService, private modal: CatalogModalService) {
    effect(() => this.draft.set(Math.max(1, this.cartQty() || 1)));
  }

  private pendingQty       = computed(() => this.catalogService.pendingQtys()[this.product.id] ?? 0);
  private adjustedLotsInfo = computed(() => adjustLotsForPending(this.product.lots_info, this.pendingQty()));

  avail = computed(() => this.adjustedLotsInfo()?.available_stock ?? 0);

  cartQty = computed(() => this.cart.quantityOf(this.product.id));

  draft = signal(1);

  hasTiers = computed(() => hasActiveTiers(this.product));

  activeTiers = computed(() =>
    (this.product.price_tiers ?? [])
      .filter(t => t.active)
      .sort((a, b) => a.min_quantity - b.min_quantity)
  );

  expiringLots = computed(() =>
    (this.adjustedLotsInfo()?.lots ?? []).filter(l => l.available_stock > 0 && l.expiry_date)
  );

  displayPrice = computed(() => resolveUnitPrice(this.product, this.draft()));

  tierLabel = computed(() => appliedTierLabel(this.product, this.displayPrice()));

  appliedTier = computed(() =>
    this.activeTiers().filter(t => this.draft() >= t.min_quantity).pop() ?? null
  );

  stockDotColor = computed(() => {
    const a = this.avail();
    if (a <= 0)  return 'var(--bs-danger)';
    if (a <= 5)  return 'var(--bs-warning)';
    return 'var(--bs-success)';
  });
  expiryBadgeClass = expiryBadgeClass;
  expiryLabel = expiryLabel;

  open(): void {
    this.modal.open(this.product);
  }

  decrementDraft(): void {
    this.draft.update(q => Math.max(0, q - 1));
  }

  incrementDraft(): void {
    const max = this.avail();
    if (this.draft() >= max) {
      showStockAlert(max);
      return;
    }
    this.draft.update(q => Math.min(max, q + 1));
  }

  onDraftInput(value: string): void {
    const parsed = Math.floor(Number(value));
    const max = this.avail();
    if (Number.isFinite(parsed) && parsed > max) {
      showStockAlert(max);
    }
    this.draft.set(Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : 0);
  }

  confirm(): void {
    const draft = this.draft();
    if (this.cartQty() > 0) {
      if (draft === 0) {
        this.cart.remove(this.product.id);
      } else {
        this.cart.updateQuantity(this.product.id, draft);
      }
    } else if (draft > 0) {
      this.cart.add(this.product, draft);
    }
  }
}
