import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogAppearance } from '../models/catalog-appearance.model';

const APPEARANCE_CACHE_KEY = 'catalog_appearance';

@Injectable({ providedIn: 'root' })
export class CatalogAppearanceService {
  private base = environment.apiUrl;

  /** Ambientación del catálogo (fondos + banners), cacheada en localStorage para evitar parpadeos. */
  readonly appearance = signal<CatalogAppearance | null>(this.loadCached());

  constructor(private http: HttpClient) {
    const cached = this.loadCached();
    if (cached?.settings?.card_image_ratio) {
      this.applyCardRatio(cached.settings.card_image_ratio);
    }
    this.fetch().subscribe({
      next: appearance => {
        this.appearance.set(appearance);
        localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(appearance));
        if (appearance.settings?.card_image_ratio) {
          this.applyCardRatio(appearance.settings.card_image_ratio);
        }
      },
      error: () => {},
    });
  }

  private applyCardRatio(ratio: number): void {
    document.documentElement.style.setProperty('--catalog-card-img-ratio', ratio + '%');
  }

  fetch(): Observable<CatalogAppearance> {
    return this.http.get<CatalogAppearance>(`${this.base}/catalog/appearance`);
  }

  private loadCached(): CatalogAppearance | null {
    try {
      const raw = localStorage.getItem(APPEARANCE_CACHE_KEY);
      return raw ? JSON.parse(raw) as CatalogAppearance : null;
    } catch {
      return null;
    }
  }
}
