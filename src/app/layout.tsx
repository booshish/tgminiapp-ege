import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Точка — подготовка к ОГЭ и ЕГЭ",
  description:
    "Точка — бесплатная теория и самостоятельная практика по математике для подготовки к ОГЭ и ЕГЭ.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8f4",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var p=JSON.parse(localStorage.getItem('tochka-learning-v2')||'{}');document.documentElement.dataset.theme=p.theme==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
