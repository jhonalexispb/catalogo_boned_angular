import Swal from 'sweetalert2';

function themeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue('--bs-body-bg').trim() || '#fff',
    color: styles.getPropertyValue('--bs-body-color').trim() || '#000',
    confirmButtonColor: styles.getPropertyValue('--brand-primary').trim() || '#0d6efd',
  };
}

/** Muestra un error genérico como diálogo SweetAlert. */
export function showErrorAlert(message: string, title = 'No se pudo guardar'): void {
  Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'Entendido',
    ...themeColors(),
  });
}

/** Muestra una alerta indicando que la cantidad solicitada excede el stock disponible. */
export function showStockAlert(available: number): void {
  Swal.fire({
    icon: 'warning',
    title: 'Stock no disponible',
    text: available > 0
      ? `Solo hay ${available} unidad${available === 1 ? '' : 'es'} disponible${available === 1 ? '' : 's'}.`
      : 'No hay stock disponible para este producto.',
    confirmButtonText: 'Entendido',
    ...themeColors(),
  });
}

/** Muestra una alerta confirmando que el pedido fue enviado correctamente. */
export function showOrderConfirmation(
  title = '¡Pedido enviado!',
  text = 'Tu pedido fue enviado correctamente.',
): Promise<unknown> {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Ver pedido',
    ...themeColors(),
  });
}

/**
 * Pregunta qué hacer cuando el cliente ya tiene un pedido activo.
 * Retorna: 'add' → agregar al existente, 'new' → crear nuevo, 'cancel' → no hacer nada.
 */
export function showExistingOrderDialog(code: string): Promise<'add' | 'new' | 'cancel'> {
  const { background, color, confirmButtonColor } = themeColors();
  return Swal.fire({
    icon: 'question',
    title: 'Ya tienes un pedido activo',
    html: `Tienes el pedido <strong>${code}</strong> en proceso.<br>¿Qué quieres hacer con los productos del carrito?`,
    confirmButtonText: 'Agregar al pedido existente',
    denyButtonText: 'Crear pedido nuevo',
    cancelButtonText: 'Volver al carrito',
    showDenyButton: true,
    showCancelButton: true,
    background,
    color,
    confirmButtonColor,
  }).then(result => {
    if (result.isConfirmed) return 'add';
    if (result.isDenied)    return 'new';
    return 'cancel';
  });
}
