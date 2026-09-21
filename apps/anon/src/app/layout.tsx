import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anon — prove you're human, not who you are",
  description:
    "A World Mini App for anonymous discussion where every voice is a verified human and no voice is a name.",
  applicationName: "Anon",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${outfit.variable} h-full`}
    >
      <body className="min-h-full bg-stage text-ink">
        <Providers>
          <div className="flex min-h-dvh items-center justify-center p-0 md:p-6">
            <div className="relative h-dvh w-full overflow-hidden bg-paper md:h-[min(844px,calc(100dvh-48px))] md:w-[390px] md:rounded-[40px] md:border md:border-rule-strong md:shadow-[0_30px_70px_rgba(0,0,0,0.12)]">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
