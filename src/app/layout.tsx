import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MOMternal — Mobilized Outreach Maternal Support",
  description: "AI-assisted maternal health record system for nurses handling prenatal patients. Following ADPIE Framework, SOAP Format, NNN Linkages, ICD-10, and Levels of Prevention.",
  keywords: ["maternal health", "prenatal care", "nursing", "ADPIE", "SOAP", "MOMternal"],
  authors: [{ name: "MOMternal Team" }],
  icons: {
    icon: "/momternal_logo.png",
  },
  openGraph: {
    title: "MOMternal — Mobilized Outreach Maternal Support",
    description: "AI-assisted maternal health record system for prenatal care",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('momternal-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
