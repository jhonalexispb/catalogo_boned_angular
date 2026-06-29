import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogClient } from '../models/empresa.model';
import { PaginatedProducts, Product, ProductLaboratory } from '../models/product.model';
import { CatalogRequest } from '../models/catalog-request.model';

export interface BrowseFilters {
  search?: string;
  category_id?: number;
  laboratory_id?: number;
  lab_ids?: number[];
  product_id?: number;
  per_page?: number;
  page?: number;
}

export interface CartItemInput {
  product_id: number;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private base = environment.apiUrl;

  /** UUID generado una vez por sesión de app — vincula visita anónima con identificación posterior. */
  readonly sessionKey: string = (() => {
    const key = 'catalog_session_key';
    let sk = sessionStorage.getItem(key);
    if (!sk) { sk = crypto.randomUUID(); sessionStorage.setItem(key, sk); }
    return sk;
  })();

  /** Indica si el catálogo ya se cargó al menos una vez en esta sesión (para no repetir la pantalla de carga). */
  hasLoadedCatalog = false;

  /** Mapa product_id → cantidad en pedidos activos del cliente (no convertidos/cancelados). */
  pendingQtys = signal<Record<number, number>>({});

  loadPendingQuantities(): void {
    this.http.get<{ quantities: Record<number, number> }>(`${this.base}/catalog/pending-quantities`)
      .subscribe({ next: res => this.pendingQtys.set(res.quantities), error: () => {} });
  }

  /** Registra la visita en el backend. Fire-and-forget — se llama una vez al iniciar la app. */
  trackVisit(): void {
    this.http.post(`${this.base}/catalog/visit`, { session_key: this.sessionKey })
      .subscribe({ error: () => {} });
  }

  constructor(private http: HttpClient) {}

  getLabs(): Observable<{ labs: ProductLaboratory[] }> {
    return this.http.get<{ labs: ProductLaboratory[] }>(`${this.base}/catalog/labs`);
  }

  browse(filters: BrowseFilters = {}): Observable<PaginatedProducts> {
    let p = new HttpParams();
    if (filters.search)        p = p.set('search', filters.search);
    if (filters.category_id)   p = p.set('category_id', String(filters.category_id));
    if (filters.laboratory_id) p = p.set('laboratory_id', String(filters.laboratory_id));
    if (filters.lab_ids?.length) p = p.set('lab_ids', filters.lab_ids.join(','));
    if (filters.product_id)     p = p.set('product_id', String(filters.product_id));
    p = p.set('per_page', String(filters.per_page ?? 50));
    if (filters.page)          p = p.set('page', String(filters.page));

    return this.http.get<PaginatedProducts>(`${this.base}/catalog/browse`, { params: p });
  }

  identify(documento: string): Observable<{ token: string; client: CatalogClient }> {
    return this.http.post<{ token: string; client: CatalogClient }>(`${this.base}/catalog/identify`, {
      documento,
      session_key: this.sessionKey,
    });
  }

  me(): Observable<{ client: CatalogClient; recommendations: Product[] }> {
    return this.http.get<{ client: CatalogClient; recommendations: Product[] }>(`${this.base}/catalog/me`);
  }

  getRequests(): Observable<{ requests: CatalogRequest[] }> {
    return this.http.get<{ requests: CatalogRequest[] }>(`${this.base}/catalog/requests`);
  }

  getRequest(id: number): Observable<{ request: CatalogRequest }> {
    return this.http.get<{ request: CatalogRequest }>(`${this.base}/catalog/requests/${id}`);
  }

  createRequest(items: CartItemInput[], notes?: string): Observable<{ message: string; request: CatalogRequest }> {
    return this.http.post<{ message: string; request: CatalogRequest }>(`${this.base}/catalog/requests`, {
      items,
      notes: notes || undefined,
    });
  }

  acceptAvailable(id: number): Observable<{ message: string; request: CatalogRequest }> {
    return this.http.post<{ message: string; request: CatalogRequest }>(`${this.base}/catalog/requests/${id}/accept-available`, {});
  }

  cancelRequest(id: number): Observable<{ message: string; request: CatalogRequest }> {
    return this.http.post<{ message: string; request: CatalogRequest }>(`${this.base}/catalog/requests/${id}/cancel`, {});
  }

  updateRequest(id: number, items: { id: number; quantity: number }[]): Observable<{ message: string; request: CatalogRequest }> {
    return this.http.patch<{ message: string; request: CatalogRequest }>(`${this.base}/catalog/requests/${id}`, { items });
  }

  bulkAddItemsToRequest(id: number, items: CartItemInput[]): Observable<{ message: string; request: CatalogRequest }> {
    return this.http.post<{ message: string; request: CatalogRequest }>(`${this.base}/catalog/requests/${id}/items`, { items });
  }
}
