/**
 * IPFS utilities using Pinata as the pinning service.
 */

const PINATA_API_URL = "https://api.pinata.cloud";
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * Upload a base64-encoded image to Pinata IPFS.
 * Returns an ipfs:// URI.
 */
export async function uploadImageToIPFS(imageData: string): Promise<string> {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    throw new Error("PINATA_JWT is not configured");
  }

  // Convert base64 to Buffer
  const buffer = Buffer.from(imageData, "base64");

  const formData = new FormData();
  const blob = new Blob([buffer], { type: "image/png" });
  formData.append("file", blob, "ai-nft-artwork.png");
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: `AI NFT Artwork ${Date.now()}` })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata image upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Upload NFT metadata JSON to Pinata IPFS.
 * Returns an ipfs:// URI (tokenURI).
 */
export async function uploadMetadataToIPFS(
  name: string,
  description: string,
  imageURI: string,
  attributes?: Array<{ trait_type: string; value: string }>
): Promise<string> {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    throw new Error("PINATA_JWT is not configured");
  }

  const metadata: NFTMetadata = {
    name,
    description,
    image: imageURI,
    attributes: attributes || [],
  };

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `${name} Metadata` },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata metadata upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Convert an ipfs:// URI to an HTTP gateway URL.
 */
export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri.startsWith("ipfs://")) return ipfsUri;
  const cid = ipfsUri.replace("ipfs://", "");
  return `${IPFS_GATEWAY}${cid}`;
}
