import html2canvas from 'html2canvas';

const CAPTURE_IGNORE_CLASSES = new Set(['cam-controls', 'cam-dock', 'cam-loading']);

/** Captura vídeo + overlay do esqueleto exatamente como na tela (sem controles). */
export async function captureCameraWithSkeleton(container: HTMLElement): Promise<string | null> {
  try {
    const scale = Math.min(1.5, window.devicePixelRatio || 1);
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#050608',
      scale,
      logging: false,
      ignoreElements: (element) => {
        if (!(element instanceof HTMLElement)) return false;
        for (const cls of element.classList) {
          if (CAPTURE_IGNORE_CLASSES.has(cls)) return true;
        }
        return false;
      },
    });
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.error('captureCameraWithSkeleton', err);
    return null;
  }
}
