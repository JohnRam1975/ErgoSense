/** Mapeia a opção de qualidade das configurações para constraints de câmera. */

export function videoConstraintsForQuality(
  captureQuality: string,
  facingMode: 'user' | 'environment',
): MediaTrackConstraints {
  const q = captureQuality.toLowerCase();
  if (q.includes('1080')) {
    return { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } };
  }
  if (q.includes('480') || q.includes('sd')) {
    return { facingMode, width: { ideal: 640 }, height: { ideal: 480 } };
  }
  return { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } };
}
