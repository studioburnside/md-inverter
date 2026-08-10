import "./globals.css";

export const metadata = {
  title: ".MDinverter — Markdown to RTF, Online",
  description: "Convert Markdown to RTF or plain text instantly in your browser. No cloud, no signup. Free tier with $9 lifetime premium.",
  keywords: ["markdown", "rtf", "converter", "rich-text", "pages", "word"],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: ".MDinverter — Markdown to RTF, Online",
    description: "Convert Markdown to RTF or plain text instantly in your browser.",
    url: "https://md-inverter.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}