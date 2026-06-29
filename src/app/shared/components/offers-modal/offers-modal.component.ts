import { Component } from '@angular/core';
import { OffersModalService } from '../../../core/services/offers-modal.service';
import { CatalogAppearanceService } from '../../../core/services/catalog-appearance.service';
import { BannerCarouselComponent } from '../banner-carousel/banner-carousel.component';

@Component({
  selector: 'app-offers-modal',
  standalone: true,
  imports: [BannerCarouselComponent],
  templateUrl: './offers-modal.component.html',
})
export class OffersModalComponent {
  constructor(public modal: OffersModalService, public appearance: CatalogAppearanceService) {}
}
