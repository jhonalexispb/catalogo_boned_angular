import { Product } from '../models/product.model';

/**
 * Estimación de precio unitario en el cliente (vitrina/carrito), considerando
 * tramos por volumen. El total real se recalcula en el backend al enviar el pedido.
 */
export function resolveUnitPrice(product: Pick<Product, 'base_price' | 'price_tiers'>, quantity: number): number {
  let price = parseFloat(product.base_price);

  const applicableTiers = (product.price_tiers ?? []).filter(t => t.active && t.min_quantity <= quantity);
  if (applicableTiers.length) {
    const best = applicableTiers.reduce((a, b) => (b.min_quantity > a.min_quantity ? b : a));
    price = parseFloat(best.price);
  }

  return price;
}

/** Precio "tachado" para mostrar el ahorro (precio sin tramos). */
export function basePrice(product: Pick<Product, 'base_price'>): number {
  return parseFloat(product.base_price);
}
