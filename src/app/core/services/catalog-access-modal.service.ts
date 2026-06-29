import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CatalogAccessModalService {
  readonly visible = signal(false);

  private onSubmitCb: ((documento: string) => void) | null = null;

  open(onSubmit: (documento: string) => void): void {
    this.onSubmitCb = onSubmit;
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.onSubmitCb = null;
  }

  submit(documento: string): void {
    this.onSubmitCb?.(documento);
    this.close();
  }
}
