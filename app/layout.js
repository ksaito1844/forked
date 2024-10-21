import localFont from "next/font/local";
import "./globals.css";
import { AgoraProvider } from "@/context/voiceContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Globalie",
  description: "Under development",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AgoraProvider>
          {children}
        </AgoraProvider>
      </body>
    </html>
  );
}
