import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Vector | Digital Logbook",
  description: "Advanced flight tracking for modern pilots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          "min-h-screen bg-white text-charcoal antialiased overflow-x-hidden font-sans"
        )}
      >
        <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
