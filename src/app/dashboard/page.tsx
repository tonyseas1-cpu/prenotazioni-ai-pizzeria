import React from "react";
import { prisma } from "../../lib/tenant";

export const revalidate = 0; // Disabilita cache per aggiornamenti in tempo reale

export default async function DashboardPage() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: "pizzeria-la-bella-chieri" },
    include: {
      bookings: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!restaurant) {
    return <div style={{ padding: 40 }}>Ristorante non trovato. Esegui il seed.</div>;
  }

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: "#f4f6f8", minHeight: "100vh" }}>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ color: "#1a202c", margin: 0 }}>📊 Dashboard Prenotazioni</h1>
        <p style={{ color: "#718096" }}>{restaurant.name} (Chieri)</p>
      </header>

      <section style={{ background: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "20px" }}>Prenotazioni Ricevute</h2>

        {restaurant.bookings.length === 0 ? (
          <p style={{ color: "#a0aec0" }}>Nessuna prenotazione presente nel database.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #edf2f7", color: "#4a5568" }}>
                <th style={{ padding: "12px" }}>Cliente</th>
                <th style={{ padding: "12px" }}>Data</th>
                <th style={{ padding: "12px" }}>Ora</th>
                <th style={{ padding: "12px" }}>Ospiti</th>
                <th style={{ padding: "12px" }}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {restaurant.bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>{b.customer.name || "Anonimo"}</td>
                  <td style={{ padding: "12px" }}>{b.date}</td>
                  <td style={{ padding: "12px" }}>{b.time}</td>
                  <td style={{ padding: "12px" }}>👥 {b.guests}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ backgroundColor: "#c6f6d5", color: "#22543d", padding: "4px 8px", borderRadius: "4px", fontSize: "0.85rem" }}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
