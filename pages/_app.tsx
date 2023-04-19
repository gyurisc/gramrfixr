import { Analytics } from "@vercel/analytics/react";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={inter.className}>
      <Component {...pageProps} />
      <Analytics />
    </div>
  );
}
