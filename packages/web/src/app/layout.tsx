import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Passkey Readiness Tester",
  description: "Enterprise-grade WebAuthn implementation with security posture analysis",
  keywords: ["WebAuthn", "Passkeys", "Authentication", "Security", "FIDO2"],
  authors: [{ name: "Your Name" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased bg-gradient-to-br from-blue-50 via-white to-indigo-50`}>
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
