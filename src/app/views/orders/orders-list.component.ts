import { Component, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import {
  CatalogRequest,
  CATALOG_REQUEST_STATUS_LABELS, CATALOG_REQUEST_STATUS_COLORS,
} from '../../core/models/catalog-request.model';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent implements OnInit {
  loading = signal(true);
  requests = signal<CatalogRequest[]>([]);

  readonly statusLabels = CATALOG_REQUEST_STATUS_LABELS;
  readonly statusColors = CATALOG_REQUEST_STATUS_COLORS;

  constructor(private catalogService: CatalogService) {}

  ngOnInit(): void {
    this.catalogService.getRequests().subscribe({
      next: res => {
        this.requests.set(res.requests);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
