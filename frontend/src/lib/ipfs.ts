/**
 * IPFS utility functions for uploading images and metadata via Pinata
 */

const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";

/**
 * Convert an IPFS URI to a gateway URL for display
 */
export function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${uri.slice(7)}`;
  }
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    return uri;
  }
  return `${PINATA_GATEWAY}/${uri}`;
}

/**
 * Fetch metadata from IPFS URI
 */
export async function fetchIPFSMetadata(
  uri: string
): Promise<Record<string, unknown> | null> {
  try {
    const url = ipfsToHttp(uri);
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Upload image + metadata to IPFS via API route
 */
export async function uploadNFTToIPFS(params: {
  imageUrl: string;
  name: string;
  description: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}): Promise<{ imageUri: string; metadataUri: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "IPFS upload failed");
  }

  const data = await res.json();
  return {
    imageUri: data.imageUri,
    metadataUri: data.metadataUri,
  };
}

/**
 * Check if a string is a valid IPFS URI
 */
export function isIPFSUri(uri: string): boolean {
  return uri.startsWith("ipfs://");
}

/**
 * Extract CID from an IPFS URI
 */
export function extractCID(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    return uri.slice(7).split("/")[0];
  }
  return null;
}
