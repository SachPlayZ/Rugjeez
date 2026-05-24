import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resolution History",
  description:
    "On-chain track record of every Rugjeez prediction market — see which tokens rugged, which survived, and how the crowd priced each risk.",
  openGraph: {
    title: "Resolution History · Rugjeez",
    description:
      "On-chain track record of every Rugjeez prediction market — rugged, survived, and crowd pricing.",
    images: [{ url: "/Rugjeez Banner.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resolution History · Rugjeez",
    description:
      "On-chain track record of every Rugjeez prediction market — rugged, survived, and crowd pricing.",
    images: ["/Rugjeez Banner.png"],
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
