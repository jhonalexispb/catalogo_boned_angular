import { Component, Input, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { EmpresaService } from '../../../core/services/empresa.service';

const FALLBACK_MESSAGES = [
  'Preparando los mejores precios para ti...',
  'Estamos seleccionando tu pedido con cuidado...',
  'Gracias por confiar en nosotros, ya casi está listo...',
];

const ROTATION_MS = 2500;

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  templateUrl: './loading-screen.component.html',
})
export class LoadingScreenComponent implements OnInit, OnDestroy {
  @Input() messages: string[] = [];
  @Input() fullscreen = true;

  private currentIndex = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  currentMessage = computed(() => {
    const list = this.messages.length ? this.messages : FALLBACK_MESSAGES;
    return list[this.currentIndex() % list.length];
  });

  constructor(public empresa: EmpresaService) {}

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.currentIndex.update(i => i + 1);
    }, ROTATION_MS);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
