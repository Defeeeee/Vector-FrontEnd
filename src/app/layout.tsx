import type { Metadata } from "next";
import { Nunito, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import NextTopLoader from "nextjs-toploader";

// Single unified typeface across the app — Nunito for both body text and
// display/headline roles.
//
// The variables are named after the *role*, not the typeface: they used to be
// called --font-inter and --font-space-grotesk while actually carrying Nunito,
// which meant `font-display` in the markup applied something that was not
// Space Grotesk. Role names survive a change of face (see T3.2 in
// docs/brief/06-plan-post-flightdeck.md).
const bodyFace = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-face",
});

const displayFace = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display-face",
});

// Instrument face for anything that reads as an *instrument reading* rather than
// prose: hours, ICAO codes, registrations, UTC times, METAR, eyebrow labels.
// IBM Plex Mono is picked for its slashed zero — in a logbook the difference
// between 0 and O is not a stylistic detail.
const monoFace = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono-face",
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
    /* The font variables have to live on <html>, not <body>: `@theme` emits its
       tokens on :root, so a `--font-sans: var(--font-body-face)` there resolves
       against :root — and with the variable declared on <body> it resolved
       against nothing and came out invalid. That silently broke the `font-sans`
       and `font-mono` utilities app-wide (only the custom `font-display`
       worked, because it reads the variable at the element that uses it). */
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(bodyFace.variable, displayFace.variable, monoFace.variable)}
    >
      <body className="min-h-screen bg-white dark:bg-black text-charcoal dark:text-white antialiased overflow-x-hidden font-sans">
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
