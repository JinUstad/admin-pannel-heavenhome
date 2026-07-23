import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heaven Home Admin",
  description: "Admin dashboard for Heaven Home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col md:flex-row overflow-hidden bg-[#0a0a0a] text-white">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] pt-14 md:pt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
