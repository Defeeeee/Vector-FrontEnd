import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import NextTopLoader from "nextjs-toploader";

// Single unified typeface across the app — Nunito for both body text and display/headline roles.
const nunitoSans = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const nunitoDisplay = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
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
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          nunitoSans.variable,
          nunitoDisplay.variable,
          "min-h-screen bg-white dark:bg-black text-charcoal dark:text-white antialiased overflow-x-hidden font-sans"
        )}
      >
        <NextTopLoader
          color="#18181b"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #18181b,0 0 5px #18181b"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
