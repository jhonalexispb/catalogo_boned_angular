import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { CatalogAuthService } from '../../core/services/catalog-auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { CatalogAccessModalService } from '../../core/services/catalog-access-modal.service';
import { buildAccessRequestWhatsappLink } from '../../core/utils/whatsapp.util';

@Component({
  selector: 'app-identify',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './identify.component.html',
})
export class IdentifyComponent {
  documento = '';
  loading = signal(false);
  errorMsg = signal('');

  constructor(
    private catalogService: CatalogService,
    private auth: CatalogAuthService,
    private router: Router,
    public empresa: EmpresaService,
    private accessModal: CatalogAccessModalService,
  ) {}

  private whatsappLinkFor(documento?: string): string | null {
    const number = this.empresa.info()?.catalog_whatsapp_number;
    if (!number) return null;

    const empresaName = this.empresa.info()?.nombre_comercial || this.empresa.info()?.razon_social || '';
    return buildAccessRequestWhatsappLink(number, empresaName, documento || undefined);
  }

  requestAccess(): void {
    if (this.isValid) {
      const link = this.whatsappLinkFor(this.documento.trim());
      if (link) window.open(link, '_blank');
      return;
    }

    this.accessModal.open(documento => {
      const link = this.whatsappLinkFor(documento);
      if (link) window.open(link, '_blank');
    });
  }

  get isValid(): boolean {
    return /^\d{8}$|^\d{11}$/.test(this.documento.trim());
  }

  submit(): void {
    if (!this.isValid || this.loading()) return;

    this.loading.set(true);
    this.errorMsg.set('');

    this.catalogService.identify(this.documento.trim()).subscribe({
      next: res => {
        this.auth.login(res.token, res.client);
        this.loading.set(false);
        this.auth.transition.set('login');
        setTimeout(() => {
          this.auth.transition.set(null);
          this.router.navigate(['/']);
        }, 1000);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'No se pudo verificar tu documento. Intenta nuevamente.');
      },
    });
  }
}
