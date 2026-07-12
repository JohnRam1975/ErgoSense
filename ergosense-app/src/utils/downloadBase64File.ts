export function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const link = document.createElement('a');
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = filename;
  link.click();
}
