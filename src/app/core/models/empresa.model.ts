export interface EmpresaPublicInfo {
  razon_social: string | null;
  nombre_comercial: string | null;
  logo_url: string | null;
  catalog_whatsapp_number: string | null;
  catalog_show_lot_breakdown: boolean;
}

export interface CatalogClient {
  id: number;
  name: string;
  business_name: string;
  ruc?: string | null;
}
