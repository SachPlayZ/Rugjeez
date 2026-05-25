import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/components/WalletConnect";
import { LiveTicker } from "@/app/_components/LiveTicker";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rugjeez - Rug Pull Prediction Markets",
    template: "%s · Rugjeez",
  },
  description:
    "Autonomous AI agent on Arc that mints binary prediction markets when rug signals cross threshold. Bet USDC on whether flagged tokens will collapse.",
  openGraph: {
    title: "Rugjeez - Rug Pull Prediction Markets",
    description: "Autonomous prediction markets powered by AI rug detection.",
    type: "website",
    url: siteUrl,
    siteName: "Rugjeez",
    images: [
      {
        url: "/rugjeez-og-v2.png",
        width: 1200,
        height: 400,
        alt: "Rugjeez - Rug Pull Prediction Markets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rugjeez - Rug Pull Prediction Markets",
    description: "Autonomous prediction markets powered by AI rug detection.",
    images: ["/rugjeez-og-v2.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
    other: [
      { rel: "manifest", url: "/favicon/site.webmanifest" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Rugjeez",
  url: siteUrl,
  description:
    "Autonomous AI agent on Arc Testnet that mints binary prediction markets when rug-pull signals cross a threshold. Bet USDC on whether flagged tokens will collapse.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WalletProvider>
          <TooltipProvider>
            <LiveTicker />
            {children}
            <Toaster position="bottom-right" richColors theme="dark" />
          </TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
