import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Console",
  description:
    "Watch Rugjeez reason about a real NFI blacklist token and mint a live prediction market on Arc Testnet in seconds — no simulation.",
  openGraph: {
    title: "Demo Console · Rugjeez",
    description:
      "Watch the AI agent reason and mint a prediction market live on Arc Testnet.",
    images: [{ url: "/rugjeez-banner.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Demo Console · Rugjeez",
    description:
      "Watch the AI agent reason and mint a prediction market live on Arc Testnet.",
    images: ["/rugjeez-banner.png"],
  },
};

import { DemoGate } from "./DemoGate";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoGate>{children}</DemoGate>;
}
