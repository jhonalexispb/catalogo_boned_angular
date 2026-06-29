/** Construye el link de WhatsApp para solicitar acceso al catálogo (sin detallar productos del carrito). */
export function buildCartWhatsappLink(
  number: string,
  empresaName: string,
  notes?: string,
  documento?: string,
): string {
  const greeting = `Hola${empresaName ? ' ' + empresaName : ''}`;
  let text = `${greeting}, quisiera solicitar acceso al catálogo para ver mis precios y hacer pedidos.`;
  if (documento) text += ` Mi RUC o DNI es: ${documento}.`;
  if (notes) text += ` ${notes}`;

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Construye el link de WhatsApp para solicitar al vendedor que habilite el acceso al catálogo. */
export function buildAccessRequestWhatsappLink(
  number: string,
  empresaName: string,
  documento?: string,
): string {
  const greeting = `Hola${empresaName ? ' ' + empresaName : ''}`;
  const docLine = documento ? ` Mi RUC/DNI es ${documento}.` : '';
  const text = `${greeting}, quisiera solicitar acceso al catálogo para ver mis precios y hacer pedidos.${docLine}`;

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
