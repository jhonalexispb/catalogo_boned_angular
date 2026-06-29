import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';
import { resolveUnitPrice } from '../utils/pricing.util';

const CART_KEY = 'catalog_cart';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.readCart());

  count = computed(() => this.items().length);

  subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + resolveUnitPrice(i.product, i.quantity) * i.quantity, 0)
  );

  add(product: Product, quantity = 1): void {
    this.items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...items, { product, quantity }];
    });
    this.persist();
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.items.update(items => items.map(i => i.product.id === productId ? { ...i, quantity } : i));
    this.persist();
  }

  remove(productId: number): void {
    this.items.update(items => items.filter(i => i.product.id !== productId));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    this.persist();
  }

  quantityOf(productId: number): number {
    return this.items().find(i => i.product.id === productId)?.quantity ?? 0;
  }

  private persist(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items()));
  }

  private readCart(): CartItem[] {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }
}
