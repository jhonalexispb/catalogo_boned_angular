import { Injectable, signal } from '@angular/core';
import { CatalogClient } from '../models/empresa.model';

const TOKEN_KEY  = 'catalog_token';
const CLIENT_KEY = 'catalog_client';

@Injectable({ providedIn: 'root' })
export class CatalogAuthService {
  token  = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  client = signal<CatalogClient | null>(this.readClient());

  /** Pantalla de carga mostrada durante la transición de inicio/cierre de sesión. */
  transition = signal<'login' | 'logout' | null>(null);

  isLoggedIn(): boolean {
    return !!this.token();
  }

  login(token: string, client: CatalogClient): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
    this.token.set(token);
    this.client.set(client);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CLIENT_KEY);
    this.token.set(null);
    this.client.set(null);
  }

  private readClient(): CatalogClient | null {
    const raw = localStorage.getItem(CLIENT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CatalogClient;
    } catch {
      return null;
    }
  }
}
