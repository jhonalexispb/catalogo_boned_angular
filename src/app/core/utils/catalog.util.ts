import { Product, ProductLotsInfo, ProductPriceTier } from '../models/product.model';

/** Días restantes hasta la fecha de vencimiento (negativo si ya venció). */
export function daysUntilExpiry(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

/** Clase de badge según cercanía al vencimiento. */
export function expiryBadgeClass(dateStr: string | null): string {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return 'bg-secondary';
  if (days <= 30) return 'bg-danger';
  if (days <= 90) return 'bg-warning text-dark';
  return 'bg-success';
}

/** Texto del badge de vencimiento (fecha o "Vencido"/"S/V"). */
export function expiryLabel(dateStr: string | null): string {
  if (!dateStr) return 'S/V';
  const days = daysUntilExpiry(dateStr);
  if (days !== null && days <= 0) return 'Vencido';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Indica si un número de lote es un lote real (no un placeholder "sin lote"). */
export function isRealLot(lotNumber: string | null | undefined): boolean {
  if (!lotNumber) return false;
  const up = lotNumber.toUpperCase();
  return up !== 'SIN-LOTE' && up !== 'SIN LOTE' && up !== 'SINLOTE';
}

export type StockLevel = 'out' | 'low' | 'mid' | 'ok';

/** Nivel de stock disponible del producto. */
export function stockLevel(product: Pick<Product, 'lots_info'>): StockLevel {
  const available = product.lots_info?.available_stock ?? 0;
  if (available <= 0) return 'out';
  if (available <= 5) return 'low';
  if (available <= 20) return 'mid';
  return 'ok';
}

/** Color del indicador de stock, según el nivel. */
export function stockDotColor(product: Pick<Product, 'lots_info'>): string {
  switch (stockLevel(product)) {
    case 'out': return 'var(--bs-danger)';
    case 'low': return 'var(--bs-warning)';
    default: return 'var(--bs-success)';
  }
}

/** Indica si el producto tiene alguna escala de precio activa. */
export function hasActiveTiers(product: Pick<Product, 'price_tiers'>): boolean {
  return (product.price_tiers ?? []).some(t => t.active);
}

/** Devuelve las escalas activas, ordenadas de mayor a menor cantidad mínima. */
export function activeTiers(product: Pick<Product, 'price_tiers'>): ProductPriceTier[] {
  return (product.price_tiers ?? [])
    .filter(t => t.active)
    .sort((a, b) => b.min_quantity - a.min_quantity);
}

/** Etiqueta de la escala aplicada al precio unitario dado (o null si es el precio base). */
export function appliedTierLabel(product: Pick<Product, 'base_price' | 'price_tiers'>, unitPrice: number): string | null {
  if (Math.abs(Number(unitPrice) - Number(product.base_price)) < 0.01) return null;
  const tier = (product.price_tiers ?? [])
    .filter(t => t.active)
    .find(t => Math.abs(Number(t.price) - Number(unitPrice)) < 0.01);
  return tier ? `Escala ×${tier.min_quantity}` : 'Precio especial';
}

/** Mapa lote → cantidad a descontar, siguiendo FEFO (lote más próximo a vencer primero). */
export function fefoAllocationMap(product: Pick<Product, 'lots_info'>, qty: number): Map<number, number> {
  const lots = (product.lots_info?.lots ?? [])
    .filter(l => l.available_stock > 0)
    .slice()
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  const map = new Map<number, number>();
  let remaining = qty;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.available_stock, remaining);
    map.set(lot.id, take);
    remaining -= take;
  }
  return map;
}

/**
 * Descuenta `pendingQty` de los lotes siguiendo FEFO, igual que si el sistema
 * ya hubiera reservado esas unidades. Devuelve un nuevo `ProductLotsInfo` con
 * los stocks ajustados (lotes agotados quedan fuera).
 */
export function adjustLotsForPending(lotsInfo: ProductLotsInfo | null, pendingQty: number): ProductLotsInfo | null {
  if (!lotsInfo || pendingQty <= 0) return lotsInfo;

  const sorted = [...lotsInfo.lots]
    .filter(l => l.available_stock > 0)
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  let remaining = pendingQty;
  const adjustedLots = sorted.map(lot => {
    if (remaining <= 0) return lot;
    const deduct = Math.min(lot.available_stock, remaining);
    remaining -= deduct;
    return { ...lot, available_stock: lot.available_stock - deduct };
  }).filter(l => l.available_stock > 0);

  const newAvailable = Math.max(0, lotsInfo.available_stock - pendingQty);

  return {
    ...lotsInfo,
    available_stock: newAvailable,
    count: adjustedLots.length,
    lots: adjustedLots,
  };
}

/** Cantidad solicitada que excede el stock disponible. */
export function fefoShortfall(product: Pick<Product, 'lots_info'>, qty: number): number {
  const available = product.lots_info?.available_stock ?? 0;
  return Math.max(0, qty - available);
}

/** Color de texto legible (negro/blanco) sobre un fondo hexadecimal, según luminancia. */
export function readableTextColor(hex: string | null): string {
  if (!hex) return 'var(--bs-body-color)';
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#212529' : '#ffffff';
}
