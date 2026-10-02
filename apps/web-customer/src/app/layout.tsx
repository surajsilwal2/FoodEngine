import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import { AuthContextProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import AppHeader from "@/components/layout/AppHeader";

// Display face (headings, restaurant names) + quiet text face (UI copy).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FoodEngine · Order food",
  description: "Browse local restaurants and follow your order from kitchen to door.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* bg-canvas keeps the surface consistent between routes (no white flash). */}
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <QueryProvider>
          <AuthContextProvider>
            <CartProvider>
              {/* Shared app chrome — renders itself null on the auth routes. */}
              <AppHeader />
              {children}
            </CartProvider>
          </AuthContextProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
