import React from "react";

export const metadata = {
  title: "SaaS Prenotazioni AI - Dashboard Ristoranti",
  description: "Piattaforma Multi-Tenant Gestione Prenotazioni WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: 0, backgroundColor: "#f4f6f8" }}>
        {children}
      </body>
    </html>
  );
}