import "./globals.css";
import { Toaster } from "react-hot-toast";
import StructuraToaster from "@/components/ui/Toaster";
import ThemeProvider from "@/components/layout/ThemeProvider";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["DSA visualizer", "collaborative whiteboard", "AI canvas", "algorithm visualization", "developer tools"],
  authors: [{ name: "Yuvraj Singh" }],
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          {/* react-hot-toast — used by older auth/dashboard toasts */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                boxShadow: "var(--shadow-lg)",
              },
              success: { iconTheme: { primary: "var(--success)", secondary: "white" } },
              error:   { iconTheme: { primary: "var(--danger)",  secondary: "white" } },
            }}
          />
          {/* Custom toaster — used by board page (Day 9) */}
          <StructuraToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
