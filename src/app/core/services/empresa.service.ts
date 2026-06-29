import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmpresaPublicInfo } from '../models/empresa.model';

const EMPRESA_CACHE_KEY = 'catalog_empresa_info';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private base = environment.apiUrl;

  /** Datos públicos de la empresa, cacheados en localStorage para evitar parpadeos. */
  readonly info = signal<EmpresaPublicInfo | null>(this.loadCached());

  constructor(private http: HttpClient) {
    this.publicInfo().subscribe({
      next: info => {
        this.info.set(info);
        localStorage.setItem(EMPRESA_CACHE_KEY, JSON.stringify(info));
      },
      error: () => {},
    });
  }

  publicInfo(): Observable<EmpresaPublicInfo> {
    return this.http.get<EmpresaPublicInfo>(`${this.base}/empresa/public`);
  }

  private loadCached(): EmpresaPublicInfo | null {
    try {
      const raw = localStorage.getItem(EMPRESA_CACHE_KEY);
      return raw ? JSON.parse(raw) as EmpresaPublicInfo : null;
    } catch {
      return null;
    }
  }
}
