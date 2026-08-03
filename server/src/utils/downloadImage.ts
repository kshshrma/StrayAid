export async function downloadImageAsBase64(imageUrl: string) {
  // Download image from Supabase
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to download image.");
  }

  // Convert image to ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();

  // Convert to Buffer
  const buffer = Buffer.from(arrayBuffer);

  // Convert to Base64
  const base64 = buffer.toString("base64");

  // Get image type
  const mimeType =
    response.headers.get("content-type") ||
    "image/jpeg";

  return {
    base64,
    mimeType,
  };
}