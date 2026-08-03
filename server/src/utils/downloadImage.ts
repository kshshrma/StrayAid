export async function downloadImageAsBase64(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to download image.");
  }

  const arrayBuffer = await response.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  return {
    base64: buffer.toString("base64"),
    mimeType:
      response.headers.get("content-type") ||
      "image/jpeg",
  };
}