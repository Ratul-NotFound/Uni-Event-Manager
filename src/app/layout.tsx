import type { Metadata } from "next";
import { Inter, Montserrat, Playfair_Display, Cinzel } from "next/font/google";
import { ThemeProvider } from "@/core/context/ThemeContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampusClub Suite | Zero-Cost University Club Operations Engine",
  description:
    "100% Free client-compute tool for university clubs: 1,000+ bulk certificate generator, smart anti-cheating seat plan allocator, Google Form data refinery, direct email dispatch, and event day tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${playfair.variable} ${cinzel.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased transition-colors duration-150">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
