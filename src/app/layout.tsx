import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { GuidedTour } from "@/components/onboarding/GuidedTour";

// Force dynamic rendering on all pages under this layout.
// In Next.js standalone mode, prerendered (static) pages are served
// directly from disk by server.js, bypassing the middleware pipeline.
// With auth enabled, every request must go through the middleware to
// check the session cookie — so no page can be statically cached.
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workforce Planning",
  description: "Scenario-based workforce planning tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Providers>
          {children}
          <GuidedTour />
        </Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
