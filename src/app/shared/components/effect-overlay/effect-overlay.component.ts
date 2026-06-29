import { Component, Input, computed, signal } from '@angular/core';
import { CatalogEventEffect } from '../../../core/models/catalog-appearance.model';

interface EffectParticle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  color: string;
  emoji: string;
}

const CONFETTI_COLORS = ['#ff4d4f', '#ffd400', '#1890ff', '#52c41a', '#ff7a45', '#9254de'];
const BALLOON_COLORS  = ['#ff6b6b', '#ffd93d', '#6bd9ff', '#9b6bff', '#6bff9b'];
const FIREWORK_EMOJIS = ['✨', '🎉', '🎆', '🎇'];

@Component({
  selector: 'app-effect-overlay',
  standalone: true,
  templateUrl: './effect-overlay.component.html',
})
export class EffectOverlayComponent {
  private _type = signal<CatalogEventEffect | null>(null);

  @Input()
  set type(value: CatalogEventEffect | null | undefined) {
    this._type.set(value ?? null);
  }
  get type(): CatalogEventEffect | null {
    return this._type();
  }

  particles = computed<EffectParticle[]>(() => {
    const type = this._type();
    if (!type || type === 'none') return [];

    const count = type === 'fireworks' ? 18 : 28;
    return Array.from({ length: count }, () => this.randomParticle(type));
  });

  isConfetti  = computed(() => this._type() === 'confetti');
  isSnow      = computed(() => this._type() === 'snow');
  isFireworks = computed(() => this._type() === 'fireworks');
  isBalloons  = computed(() => this._type() === 'balloons');

  private randomParticle(type: CatalogEventEffect): EffectParticle {
    const left     = Math.random() * 100;
    const delay    = Math.random() * 4;
    const duration = 3 + Math.random() * 4;
    const size     = 8 + Math.random() * 16;
    const rotation = Math.random() * 360;

    switch (type) {
      case 'confetti':
        return { left, delay, duration, size, rotation, color: this.randomFrom(CONFETTI_COLORS), emoji: '' };
      case 'balloons':
        return { left, delay, duration: 6 + Math.random() * 5, size: size + 16, rotation, color: this.randomFrom(BALLOON_COLORS), emoji: '' };
      case 'fireworks':
        return { left, delay, duration: 1.5 + Math.random() * 1.5, size: size + 10, rotation, color: '', emoji: this.randomFrom(FIREWORK_EMOJIS) };
      default: // snow
        return { left, delay, duration: 6 + Math.random() * 6, size: size * 0.7, rotation, color: '', emoji: '' };
    }
  }

  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
