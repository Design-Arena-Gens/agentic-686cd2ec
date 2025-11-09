export const metadata = {
  title: "Agentic ETH AI Trader",
  description: "Advanced AI Trading Agent for ETH with multi-timeframe confluence",
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="__app__" className="app-container">{children}</div>
      </body>
    </html>
  );
}
