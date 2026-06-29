import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogAccessModalService } from '../../../core/services/catalog-access-modal.service';

@Component({
  selector: 'app-catalog-access-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catalog-access-modal.component.html',
})
export class CatalogAccessModalComponent {
  documento = '';
  errorMsg = signal('');

  constructor(public modal: CatalogAccessModalService) {}

  get isValid(): boolean {
    return /^\d{8}$|^\d{11}$/.test(this.documento.trim());
  }

  submit(): void {
    if (!this.isValid) {
      this.errorMsg.set('Ingresa un RUC (11 dígitos) o DNI (8 dígitos) válido.');
      return;
    }
    const documento = this.documento.trim();
    this.reset();
    this.modal.submit(documento);
  }

  close(): void {
    this.reset();
    this.modal.close();
  }

  private reset(): void {
    this.documento = '';
    this.errorMsg.set('');
  }
}
