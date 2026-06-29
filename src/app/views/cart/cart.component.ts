import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartItem, CartService } from '../../core/services/cart.service';
import { CatalogAuthService } from '../../core/services/catalog-auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { CatalogAccessModalService } from '../../core/services/catalog-access-modal.service';
import { resolveUnitPrice } from '../../core/utils/pricing.util';
import { buildCartWhatsappLink } from '../../core/utils/whatsapp.util';
import { showStockAlert, showOrderConfirmation, showExistingOrderDialog } from '../../core/utils/alert.util';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  notes = '';
  sending = signal(false);
  errorMsg = signal('');

  constructor(
    public cart: CartService,
    public auth: CatalogAuthService,
    public empresa: EmpresaService,
    public catalogService: CatalogService,
    private router: Router,
    private accessModal: CatalogAccessModalService,
  ) {}

  unitPrice(item: CartItem): number {
    return resolveUnitPrice(item.product, item.quantity);
  }

  lineTotal(item: CartItem): number {
    return this.unitPrice(item) * item.quantity;
  }

  availFor(productId: number): number {
    const item = this.cart.items().find(i => i.product.id === productId);
    const total   = item?.product.lots_info?.available_stock ?? Infinity;
    const pending = this.catalogService.pendingQtys()[productId] ?? 0;
    return Math.max(0, total - pending);
  }

  inc(productId: number, current: number): void {
    const avail = this.availFor(productId);
    if (current >= avail) {
      showStockAlert(avail);
      return;
    }
    this.cart.updateQuantity(productId, current + 1);
  }

  dec(productId: number, current: number): void {
    this.cart.updateQuantity(productId, current - 1);
  }

  requestAccess(): void {
    const number = this.empresa.info()?.catalog_whatsapp_number;
    if (!number) return;

    const empresaName = this.empresa.info()?.nombre_comercial || this.empresa.info()?.razon_social || '';
    this.accessModal.open(documento => {
      const link = buildCartWhatsappLink(number, empresaName, this.notes, documento);
      window.open(link, '_blank');
    });
  }

  submit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/ingresar']);
      return;
    }
    if (!this.cart.items().length || this.sending()) return;

    this.sending.set(true);
    this.errorMsg.set('');

    this.catalogService.getRequests().subscribe({
      next: res => {
        const active = res.requests.find(r => r.status !== 'converted' && r.status !== 'cancelled');
        if (active) {
          this.sending.set(false);
          showExistingOrderDialog(active.code).then(choice => {
            if (choice === 'cancel') return;
            if (choice === 'add') this.addToExisting(active.id);
            else this.createNew();
          });
        } else {
          this.createNew();
        }
      },
      error: () => this.createNew(),
    });
  }

  private addToExisting(requestId: number): void {
    this.sending.set(true);
    this.errorMsg.set('');
    const items = this.cart.items().map(i => ({ product_id: i.product.id, quantity: i.quantity }));
    this.catalogService.bulkAddItemsToRequest(requestId, items).subscribe({
      next: res => {
        this.sending.set(false);
        this.cart.clear();
        showOrderConfirmation('¡Productos agregados!', 'Se agregaron a tu pedido existente.').then(() => {
          this.router.navigate(['/pedidos', res.request.id]);
        });
      },
      error: err => {
        this.sending.set(false);
        this.errorMsg.set(err.error?.message ?? 'No se pudo agregar al pedido existente.');
      },
    });
  }

  private createNew(): void {
    this.sending.set(true);
    this.errorMsg.set('');
    const items = this.cart.items().map(i => ({ product_id: i.product.id, quantity: i.quantity }));
    this.catalogService.createRequest(items, this.notes).subscribe({
      next: res => {
        this.sending.set(false);
        this.cart.clear();
        showOrderConfirmation().then(() => {
          this.router.navigate(['/pedidos', res.request.id]);
        });
      },
      error: err => {
        this.sending.set(false);
        this.errorMsg.set(err.error?.message ?? 'No se pudo enviar el pedido. Intenta nuevamente.');
      },
    });
  }
}
