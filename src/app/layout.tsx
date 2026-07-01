import type { Metadata } from "next";
import { Geist, Roboto } from "next/font/google";
import "./globals.css";
import { AuthHydrator } from "@/components/auth/AuthHydrator";
import { BackendStatus } from "@/components/layout/BackendStatus";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Numbers (`.nums`) render in Roboto with tabular figures — a clean geometric sans that
// matches the Tradovate look (proportional, not monospace; columns stay aligned).
const robotoNums = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Trader Portal",
  description: "Real-time trading portal and admin CRM",
};

// Applies the saved theme before paint to avoid a flash of the wrong theme.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('tp-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${robotoNums.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full">
        <AuthHydrator />
        <BackendStatus />
        {children}
      </body>
    </html>
  );
}
