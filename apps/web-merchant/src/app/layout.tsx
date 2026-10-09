import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/providers/QueryProvider";
import AppHeader from "@/components/layout/AppHeader";

// Same typeface as the other FoodEngine apps so the products feel related.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FoodEngine Merchant",
  description: "Apply to sell on FoodEngine and manage your restaurant workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      {/* bg-canvas keeps the surface consistent between routes (no white flash). */}
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <QueryProvider>
          <AuthProvider>
            {/* Shared chrome — renders nothing on the sign-in screen. */}
            <AppHeader />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
