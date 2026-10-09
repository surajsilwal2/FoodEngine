import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import AppHeader from "@/components/layout/AppHeader";
import { AuthProvider } from "@/context/AuthContext";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

// One typeface across the suite; headings are separated by weight, not family.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FoodEngine Admin",
  description: "Review merchant applications and verify delivery partners.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <QueryProvider>
          <AuthProvider>
            <AppHeader />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}