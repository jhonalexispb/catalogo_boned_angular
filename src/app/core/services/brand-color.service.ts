import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'catalog_brand_color';

export const DEFAULT_BRAND_COLOR = '#22c55e';

export const BRAND_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Menta', hex: '#22c55e' },
  { name: 'Azul', hex: '#0d6efd' },
  { name: 'Verde', hex: '#198754' },
  { name: 'Morado', hex: '#6f42c1' },
  { name: 'Rojo', hex: '#dc3545' },
  { name: 'Naranja', hex: '#fd7e14' },
  { name: 'Celeste', hex: '#0dcaf0' },
  { name: 'Rosa', hex: '#d63384' },
  { name: 'Gris azulado', hex: '#495057' },
];

@Injectable({ providedIn: 'root' })
export class BrandColorService {
  readonly color = signal<string>(this.resolveInitialColor());

  constructor() {
    this.apply(this.color());
  }

  setColor(hex: string): void {
    this.color.set(hex);
    this.apply(hex);
    localStorage.setItem(STORAGE_KEY, hex);
  }

  reset(): void {
    this.setColor(DEFAULT_BRAND_COLOR);
  }

  private apply(hex: string): void {
    const root = document.documentElement.style;
    root.setProperty('--brand-primary', hex);

    const rgb = this.hexToRgb(hex);
    if (rgb) root.setProperty('--brand-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }

  private resolveInitialColor(): string {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BRAND_COLOR;
  }
}
