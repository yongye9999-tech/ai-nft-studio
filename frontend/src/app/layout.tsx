import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI+NFT Studio | AI-Powered NFT Generation & Marketplace",
  description:
    "Generate stunning AI artwork with text prompts and mint them as NFTs. Trade, auction, and collect AI-generated art on the blockchain.",
  keywords: ["NFT", "AI", "Blockchain", "Ethereum", "Digital Art", "Marketplace"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: "#0a0a0f" }}>
        <Web3Provider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
