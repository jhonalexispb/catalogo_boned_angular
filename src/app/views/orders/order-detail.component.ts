import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import {
  CatalogRequest,
  CatalogRequestItem,
  CATALOG_REQUEST_STATUS_LABELS, CATALOG_REQUEST_STATUS_COLORS,
  CATALOG_ITEM_STATUS_LABELS,
} from '../../core/models/catalog-request.model';
import { showErrorAlert, showStockAlert } from '../../core/utils/alert.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent implements OnInit {
  loading = signal(true);
  acting  = signal(false);
  request = signal<CatalogRequest | null>(null);
  errorMsg = signal('');

  editing = signal(false);
  draftQuantities = signal<Record<number, number>>({});

  readonly statusLabels     = CATALOG_REQUEST_STATUS_LABELS;
  readonly statusColors     = CATALOG_REQUEST_STATUS_COLORS;
  readonly itemStatusLabels = CATALOG_ITEM_STATUS_LABELS;

  constructor(
    private route: ActivatedRoute,
    private catalogService: CatalogService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.catalogService.getRequest(id).subscribe({
      next: res => {
        this.request.set(res.request);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/pedidos']);
      },
    });
  }

  acceptAvailable(): void {
    const r = this.request();
    if (!r || this.acting()) return;

    this.acting.set(true);
    this.errorMsg.set('');
    this.catalogService.acceptAvailable(r.id).subscribe({
      next: res => {
        this.request.set(res.request);
        this.acting.set(false);
      },
      error: err => {
        this.acting.set(false);
        this.errorMsg.set(err.error?.message ?? 'No se pudo actualizar el pedido.');
      },
    });
  }

  cancel(): void {
    const r = this.request();
    if (!r || this.acting()) return;

    this.acting.set(true);
    this.errorMsg.set('');
    this.catalogService.cancelRequest(r.id).subscribe({
      next: res => {
        this.request.set(res.request);
        this.acting.set(false);
      },
      error: err => {
        this.acting.set(false);
        this.errorMsg.set(err.error?.message ?? 'No se pudo cancelar el pedido.');
      },
    });
  }

  // ── Edición del pedido ───────────────────────────────────────────────────

  canEdit(): boolean {
    const status = this.request()?.status;
    return status === 'pending_review' || status === 'needs_client_action';
  }

  canCancel(): boolean {
    const status = this.request()?.status;
    return status === 'pending_review' || status === 'needs_client_action';
  }

  startEdit(): void {
    const r = this.request();
    if (!r || this.acting()) return;

    // Re-consultar el pedido antes de entrar a edición para verificar que
    // el estado no cambió desde que se cargó la página
    this.acting.set(true);
    this.catalogService.getRequest(r.id).subscribe({
      next: res => {
        this.acting.set(false);
        this.request.set(res.request);

        if (!this.canEdit()) {
          showErrorAlert('Este pedido ya no se puede editar.', 'No disponible');
          return;
        }

        const draft: Record<number, number> = {};
        for (const item of res.request.items ?? []) {
          draft[item.id] = item.quantity_requested;
        }
        this.draftQuantities.set(draft);
        this.errorMsg.set('');
        this.editing.set(true);
      },
      error: () => {
        this.acting.set(false);
        showErrorAlert('No se pudo verificar el estado del pedido. Intenta nuevamente.');
      },
    });
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.draftQuantities.set({});
  }

  setQty(itemId: number, raw: number): void {
    this.draftQuantities.update(d => ({ ...d, [itemId]: Math.max(0, raw) }));
  }

  incrementQty(itemId: number): void {
    const item  = this.request()?.items?.find(i => i.id === itemId);
    const stock = item?.product_stock ?? null;
    const curr  = this.draftQuantities()[itemId] ?? 0;

    if (stock !== null && curr >= stock) {
      showStockAlert(stock);
      return;
    }
    this.setQty(itemId, curr + 1);
  }

  decrementQty(itemId: number): void {
    this.setQty(itemId, (this.draftQuantities()[itemId] ?? 0) - 1);
  }

  saveEdits(): void {
    const r = this.request();
    if (!r || this.acting()) return;

    const draft = this.draftQuantities();
    const items = Object.keys(draft).map(id => ({ id: Number(id), quantity: draft[Number(id)] }));

    this.acting.set(true);
    this.catalogService.updateRequest(r.id, items).subscribe({
      next: res => {
        this.request.set(res.request);
        this.acting.set(false);
        this.editing.set(false);
        this.draftQuantities.set({});
      },
      error: err => {
        this.acting.set(false);
        showErrorAlert(err.error?.message ?? 'No se pudo actualizar el pedido.');
      },
    });
  }
}
