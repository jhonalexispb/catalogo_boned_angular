import { Injectable, signal } from '@angular/core';
import { Product } from '../models/product.model';
import { CartService } from './cart.service';
import { showStockAlert } from '../utils/alert.util';

@Injectable({ providedIn: 'root' })
export class CatalogModalService {
  readonly product = signal<Product | null>(null);
  readonly qty = signal(1);
  readonly selectedImageIndex = signal(0);

  constructor(private cart: CartService) {}

  open(product: Product): void {
    this.product.set(product);
    this.qty.set(Math.max(1, this.cart.quantityOf(product.id) || 1));
    this.selectedImageIndex.set(0);
  }

  close(): void {
    this.product.set(null);
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  setQty(value: number): void {
    const parsed = Math.floor(Number(value));
    const avail = this.product()?.lots_info?.available_stock ?? Infinity;
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    if (next > avail) {
      showStockAlert(avail);
      this.qty.set(avail);
    } else {
      this.qty.set(next);
    }
  }

  increment(): void {
    const avail = this.product()?.lots_info?.available_stock ?? Infinity;
    if (this.qty() >= avail) {
      showStockAlert(avail);
      return;
    }
    this.qty.update(q => q + 1);
  }

  decrement(): void {
    this.qty.update(q => Math.max(1, q - 1));
  }
}
