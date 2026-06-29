export type CatalogEventEffect = 'none' | 'confetti' | 'snow' | 'fireworks' | 'balloons';

export interface CatalogAppearanceEvent {
  id: number;
  image_url: string;
  label: string | null;
  effect: CatalogEventEffect | null;
}

export interface CatalogBannerPublic {
  id: number;
  image_url: string;
  link_url: string | null;
  title: string | null;
  product_id: number | null;
}

export interface CatalogAppearanceSettings {
  banner_duration_ms: number;
  event_display_frequency: 'always' | 'daily';
  card_image_ratio: number;
}

export interface CatalogAppearance {
  event: CatalogAppearanceEvent | null;
  banners: CatalogBannerPublic[];
  loading_messages: string[];
  settings: CatalogAppearanceSettings;
}
