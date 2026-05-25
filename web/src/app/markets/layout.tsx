import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Markets",
  description:
    "Browse all open and resolved AI-minted rug-detection markets on Arc Testnet. Bet USDC on whether flagged tokens will collapse within 7 days.",
  openGraph: {
    title: "Live Markets · Rugjeez",
    description:
      "Browse all open and resolved AI-minted rug-detection markets on Arc Testnet.",
    images: [{ url: "/rugjeez-og-v2.png", width: 1200, height: 400 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Markets · Rugjeez",
    description:
      "Browse all open and resolved AI-minted rug-detection markets on Arc Testnet.",
    images: ["/rugjeez-og-v2.png"],
  },
};

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
