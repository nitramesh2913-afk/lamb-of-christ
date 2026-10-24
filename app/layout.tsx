import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AccountProvider } from "@/components/AccountProvider";

export const metadata: Metadata = {
  title: "Lamb of Christ",
  description: "Walk Daily on the Bible Way — One Step Closer Each Day.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#dcecf5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AccountProvider>
          <Nav />
          <main className="md:ml-64 px-4 pt-6 pb-28 md:pb-10 max-w-3xl mx-auto md:mx-0 md:max-w-none md:px-10">
            <div className="max-w-3xl mx-auto">{children}</div>
          </main>
        </AccountProvider>
      </body>
    </html>
  );
}
