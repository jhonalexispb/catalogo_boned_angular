export type CatalogRequestStatus =
  | 'pending_review'
  | 'needs_client_action'
  | 'ready_to_convert'
  | 'converted'
  | 'cancelled';

export type CatalogRequestItemStatus = 'pending' | 'available' | 'partial' | 'unavailable';

export interface CatalogRequestItem {
  id: number;
  product_id: number;
  product_name: string | null;
  product_sku: string | null;
  product_image_url: string | null;
  product_laboratory: string | null;
  quantity_requested: number;
  quantity_available: number | null;
  product_stock: number | null;
  item_status: CatalogRequestItemStatus;
  unit_price: string;
  subtotal: string;
  reason: string | null;
}

export interface CatalogRequest {
  id: number;
  code: string;
  status: CatalogRequestStatus;
  subtotal: string;
  total: string;
  client_notes: string | null;
  seller_notes: string | null;
  quotation_id: number | null;
  items?: CatalogRequestItem[];
  created_at: string;
  updated_at: string;
}

export const CATALOG_REQUEST_STATUS_LABELS: Record<CatalogRequestStatus, string> = {
  pending_review:      'En revisión',
  needs_client_action: 'Requiere tu confirmación',
  ready_to_convert:    'Aprobado, en proceso',
  converted:           'Convertido a pedido',
  cancelled:           'Cancelado',
};

export const CATALOG_REQUEST_STATUS_COLORS: Record<CatalogRequestStatus, string> = {
  pending_review:      'secondary',
  needs_client_action: 'warning',
  ready_to_convert:    'info',
  converted:           'success',
  cancelled:           'danger',
};

export const CATALOG_ITEM_STATUS_LABELS: Record<CatalogRequestItemStatus, string> = {
  pending:     'Pendiente',
  available:   'Disponible',
  partial:     'Parcial',
  unavailable: 'Sin stock',
};
