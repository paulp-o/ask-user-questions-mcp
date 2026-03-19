import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUQ Dashboard",
  description: "Web dashboard for AUQ session management and responses.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">
        <Header />
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </body>
    </html>
  );
}