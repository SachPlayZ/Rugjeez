import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/components/WalletConnect";
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

export const metadata: Metadata = {
  title: "Rugjeez — AI Prediction Markets",
  description:
    "Autonomous AI agent on Arc that mints binary prediction markets when rug signals cross threshold. Bet USDC on whether flagged tokens will collapse.",
  openGraph: {
    title: "Rugjeez — AI Prediction Markets",
    description: "Autonomous prediction markets powered by AI rug detection.",
    type: "website",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WalletProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" richColors theme="dark" />
          </TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
