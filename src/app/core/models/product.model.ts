export interface ProductCategory {
  id: number;
  name: string | null;
  sort_order: number | null;
  color: string | null;
}

export interface ProductLaboratory {
  id: number;
  name: string | null;
  sort_order: number | null;
  logo_url: string | null;
  banner_url: string | null;
}

export interface ProductPriceTier {
  id: number;
  min_quantity: number;
  price: string;
  active: boolean;
}

export interface ProductLot {
  id: number;
  lot_number: string | null;
  expiry_date: string | null;
  stock: number;
  reserved_stock: number;
  available_stock: number;
}

export interface ProductLotsInfo {
  count: number;
  total_stock: number;
  available_stock: number;
  nearest_expiry: { lot_number: string | null; expiry_date: string | null; stock: number } | null;
  lots: ProductLot[];
}

export interface ProductImage {
  id: number;
  url: string;
  sort_order: number | null;
  is_primary: boolean;
}

export interface Product {
  id: number;
  sku: string | null;
  name: string;
  sort_order: number | null;
  description: string | null;
  category: ProductCategory;
  laboratory: ProductLaboratory;
  base_price: string;
  igv_type: string;
  primary_image_url: string | null;
  images: ProductImage[];
  lots_info: ProductLotsInfo | null;
  price_tiers: ProductPriceTier[];
}

export interface CategoryOrders {
  [laboratoryId: string]: { [categoryId: string]: number };
}

export interface PaginatedProducts {
  data: Product[];
  meta: { total: number; last_page: number; current_page: number };
  category_orders: CategoryOrders;
}
