import { Component, computed, signal } from '@angular/core';
import { CatalogAppearanceService } from '../../../core/services/catalog-appearance.service';
import { EffectOverlayComponent } from '../effect-overlay/effect-overlay.component';

const SEEN_KEY_PREFIX = 'catalog_event_seen_';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [EffectOverlayComponent],
  templateUrl: './event-modal.component.html',
})
export class EventModalComponent {
  private dismissed = signal(false);

  event = computed(() => this.appearance.appearance()?.event ?? null);

  frequency = computed(() => this.appearance.appearance()?.settings?.event_display_frequency ?? 'daily');

  visible = computed(() => {
    const event = this.event();
    if (!event || this.dismissed()) return false;
    if (this.frequency() === 'always') return true;
    return !localStorage.getItem(SEEN_KEY_PREFIX + event.id + '_' + todayKey());
  });

  effect = computed(() => this.visible() ? this.event()?.effect ?? null : null);

  constructor(private appearance: CatalogAppearanceService) {}

  close(): void {
    const event = this.event();
    if (event && this.frequency() === 'daily') {
      localStorage.setItem(SEEN_KEY_PREFIX + event.id + '_' + todayKey(), '1');
    }
    this.dismissed.set(true);
  }
}
