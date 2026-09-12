import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siyaram Mandal — Financial Portal",
  description: "Siyaram Mitra Mandal Real-time Financial Ledger & Operations System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Siyaram Finance",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f5f8f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased font-sans bg-[#f5f8f6] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 relative">
        <div className="fixed inset-0 pointer-events-none z-0 ios-mesh-bg" aria-hidden="true" />
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
