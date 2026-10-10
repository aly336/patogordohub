export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export async function validateImage(file: File) {
  if (file.size < 1 || file.size > MAX_IMAGE_BYTES) throw new Error("Use uma imagem de até 5 MB.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const webp =
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (!(
    (jpeg && file.type === "image/jpeg") ||
    (png && file.type === "image/png") ||
    (webp && file.type === "image/webp")
  ))
    throw new Error("Use uma imagem JPG, PNG ou WebP válida.");
}
export async function optimizeImage(file: File): Promise<Blob> {
  await validateImage(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("Use uma imagem de até 40 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image decode failed");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Image encode failed"))),
        "image/webp",
        0.86,
      ),
    );
  } finally {
    bitmap.close();
  }
}
