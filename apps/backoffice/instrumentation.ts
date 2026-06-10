export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] !== 'nodejs') return;
  if (process.env['BACKOFFICE_BOOTSTRAP_EDGE'] === '0') return;

  // Edge bootstrap docker daemon olmadan calisamaz; hata varsa sessizce logla.
  try {
    const { EdgeManager, isEdgeEnabled } = await import('./server/edge');
    if (!isEdgeEnabled()) return;
    const edge = await EdgeManager.create();
    const result = await edge.ensureContainer();
    if (result.created) {
      console.log('[edge] container oluşturuldu: oserp-edge');
    }
  } catch (err) {
    console.warn('[edge] bootstrap atlandi:', err instanceof Error ? err.message : String(err));
  }
}
