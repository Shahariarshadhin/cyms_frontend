import "./globals.css";

export const metadata = {
  title: "CYMS — Cozy Yards  Management System",
  description: "Centralized management system for Cozy Yards",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
