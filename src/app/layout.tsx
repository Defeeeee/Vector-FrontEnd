import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="es" className="dark">
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-black text-white antialiased overflow-x-hidden"
        )}
      >
        <div className="fixed inset-0 vector-gradient pointer-events-none" />
        <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
