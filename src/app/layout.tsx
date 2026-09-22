import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import localFont from 'next/font/local'
// Configuración de Branley
const branley = localFont({
  src: './fonts/Branley.otf',
  variable: '--font-branley', // Definimos una variable CSS
})

// Configuración de Farmhouse
const farmhouse = localFont({
  src: './fonts/Farmhouse.otf',
  variable: '--font-farmhouse',
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Angel & Karina",
  description: "Invitación de boda",
  openGraph: {
    title: "Angel & Karina",
    description: "Invitación de boda",
    images: [{ url: "/Assets/ELEMENTOS/corazon_rosa.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${dancingScript.variable} 
          ${branley.variable} 
          ${farmhouse.variable} 
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}
