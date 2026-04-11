const PINATA_API_KEY = process.env.PINATA_API_KEY || process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || "";
const PINATA_BASE_URL = "https://api.pinata.cloud";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file (e.g. an image blob) to IPFS via Pinata.
 * @returns IPFS CID (hash)
 */
export async function uploadImage(file: File | Blob): Promise<string> {
  const formData = new FormData();
  const filename = file instanceof File ? file.name : "ai-nft-image.png";
  formData.append("file", file, filename);
  formData.append("pinataMetadata", JSON.stringify({ name: filename }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload image to IPFS: ${text}`);
  }

  const data = (await res.json()) as PinataResponse;
  return data.IpfsHash;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // ipfs://CID
  attributes?: Array<{ trait_type: string; value: string }>;
}

/**
 * Upload ERC721 metadata JSON to IPFS via Pinata.
 * @returns Full tokenURI (ipfs://CID)
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const body = JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: { name: `${metadata.name}-metadata.json` },
    pinataOptions: { cidVersion: 1 },
  });

  const res = await fetch(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload metadata to IPFS: ${text}`);
  }

  const data = (await res.json()) as PinataResponse;
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Convert an IPFS URI to an HTTP gateway URL for display.
 */
export function ipfsToHttp(ipfsUri: string): string {
  if (ipfsUri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${ipfsUri.slice(7)}`;
  }
  return ipfsUri;
}
