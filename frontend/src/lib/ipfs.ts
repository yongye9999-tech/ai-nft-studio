// src/lib/ipfs.ts — IPFS utility functions using Pinata gateway
// Provides uploadImage, uploadMetadata, and getIPFSUrl helpers for client-side use.

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Upload an image File or Blob to IPFS via the /api/upload route.
 * Returns the IPFS hash (CID) of the uploaded image.
 */
export async function uploadImage(file: File | Blob): Promise<string> {
  const formData = new FormData();
  const imageFile = file instanceof File ? file : new File([file], "image.png", { type: "image/png" });
  formData.append("image", imageFile);
  formData.append("name", imageFile.name || "ai-nft");

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Image upload failed");
  }

  const data = await res.json();
  return data.imageHash as string;
}

/**
 * Upload NFT metadata to IPFS via the /api/upload route.
 * Returns the complete tokenURI (ipfs://CID) pointing to the metadata JSON.
 */
export async function uploadMetadata(
  imageFile: File | Blob,
  name: string,
  description: string,
  attributes: Array<{ trait_type: string; value: string }> = []
): Promise<string> {
  const formData = new FormData();
  const img = imageFile instanceof File
    ? imageFile
    : new File([imageFile], "image.png", { type: "image/png" });

  formData.append("image", img);
  formData.append("name", name);
  formData.append("description", description);
  formData.append("attributes", JSON.stringify(attributes));

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Metadata upload failed");
  }

  const data = await res.json();
  return data.tokenURI as string;
}

/**
 * Convert an IPFS hash (CID) or ipfs:// URI to an HTTP gateway URL.
 *
 * @example
 * getIPFSUrl("QmXxx...") → "https://gateway.pinata.cloud/ipfs/QmXxx..."
 * getIPFSUrl("ipfs://QmXxx...") → "https://gateway.pinata.cloud/ipfs/QmXxx..."
 */
export function getIPFSUrl(hashOrUri: string): string {
  if (!hashOrUri) return "";

  // Already an HTTP URL
  if (hashOrUri.startsWith("http")) return hashOrUri;

  // Strip ipfs:// prefix
  const cid = hashOrUri.replace(/^ipfs:\/\//, "").replace(/^\/ipfs\//, "");
  return `${IPFS_GATEWAY}/${cid}`;
}

/**
 * Fetch and parse an NFT metadata JSON from an IPFS URI.
 */
export async function fetchMetadata(tokenURI: string): Promise<{
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}> {
  const url = getIPFSUrl(tokenURI);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch metadata: ${res.status}`);
  return res.json();
}
