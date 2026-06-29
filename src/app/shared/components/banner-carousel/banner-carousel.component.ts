import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogBannerPublic } from '../../../core/models/catalog-appearance.model';
import { SwipeDirective } from '../../directives/swipe.directive';

const TICK_MS = 100;

@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [RouterLink, SwipeDirective],
  templateUrl: './banner-carousel.component.html',
})
export class BannerCarouselComponent implements OnInit, OnDestroy {
  @Input({ required: true }) banners: CatalogBannerPublic[] = [];
  @Input() durationMs = 4000;
  @Output() bannerClick = new EventEmitter<CatalogBannerPublic>();

  activeIndex = signal(0);
  elapsed = signal(0);
  progress = computed(() => Math.min(this.elapsed() / this.durationMs, 1));

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.startAutoRotate();
  }

  ngOnDestroy(): void {
    this.stopAutoRotate();
  }

  startAutoRotate(): void {
    this.stopAutoRotate();
    if (this.banners.length <= 1) return;
    this.timer = setInterval(() => {
      this.elapsed.update(e => e + TICK_MS);
      if (this.elapsed() >= this.durationMs) {
        this.activeIndex.update(i => (i + 1) % this.banners.length);
        this.elapsed.set(0);
      }
    }, TICK_MS);
  }

  stopAutoRotate(): void {
    if (this.timer) clearInterval(this.timer);
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.elapsed.set(0);
    this.startAutoRotate();
  }

  next(): void {
    this.goTo((this.activeIndex() + 1) % this.banners.length);
  }

  prev(): void {
    this.goTo((this.activeIndex() - 1 + this.banners.length) % this.banners.length);
  }

  isExternalLink(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  onBannerImageClick(banner: CatalogBannerPublic): void {
    if (banner.product_id) {
      this.bannerClick.emit(banner);
    }
  }
}
