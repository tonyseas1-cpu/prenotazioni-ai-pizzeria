import React from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0; // Aggiornamento dati in tempo reale

export default async function DashboardPage() {
  const slug = "pizzeria-la-bella-chieri";

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      settings: true,
      hours: { orderBy: { dayOfWeek: "asc" } },
      agentPersona: true,
      bookings: {
        include: { customer: true },
        orderBy: [{ date: "desc" }, { time: "desc" }],
      },
      conversations: {
        include: {
          customer: true,
          messages: { orderBy: { timestamp: "desc" }, take: 3 },
          handoffs: { where: { resolved: false } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      humanHandoffs: {
        where: { resolved: false },
        include: { conversation: { include: { customer: true } } },
      },
    },
  });

  if (!restaurant) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h2>⚠️ Ristorante non trovato</h2>
        <p>Esegui il seed del database per inizializzare il ristorante pilota.</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings = restaurant.bookings.filter((b) => b.date === todayStr && b.status !== "CANCELLED");
  const futureBookings = restaurant.bookings.filter((b) => b.date >= todayStr && b.status !== "CANCELLED");
  const totalCoversToday = todayBookings.reduce((sum, b) => sum + b.guests, 0);
  const totalCancelled = restaurant.bookings.filter((b) => b.status === "CANCELLED").length;
  const pendingHandoffs = restaurant.humanHandoffs.length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Segoe UI, -apple-system, sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ backgroundColor: "#1a202c", color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "24px" }}>🍕</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>{restaurant.name}</h1>
            <span style={{ fontSize: "12px", color: "#a0aec0" }}>Pannello di Controllo SaaS Multi-Tenant</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            href="/demo"
            style={{
              backgroundColor: "#25d366",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            💬 Apri Simulatore WhatsApp
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px" }}>
        {/* KPI Cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#718096", fontWeight: "bold" }}>PRENOTAZIONI DI OGGI</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2b6cb0", marginTop: "4px" }}>{todayBookings.length}</div>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "4px" }}>Coperti totali oggi: <strong>{totalCoversToday}</strong></div>
          </div>

          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#718096", fontWeight: "bold" }}>PRENOTAZIONI FUTURE</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2f855a", marginTop: "4px" }}>{futureBookings.length}</div>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "4px" }}>Confermate da oggi in avanti</div>
          </div>

          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#718096", fontWeight: "bold" }}>RICHIESTE OPERATORE</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: pendingHandoffs > 0 ? "#e53e3e" : "#4a5568", marginTop: "4px" }}>{pendingHandoffs}</div>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "4px" }}>{pendingHandoffs > 0 ? "⚠️ Richiede attenzione" : "Nessun handoff in attesa"}</div>
          </div>

          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "13px", color: "#718096", fontWeight: "bold" }}>CANCELLAZIONI</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#c53030", marginTop: "4px" }}>{totalCancelled}</div>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "4px" }}>Storico cancellate</div>
          </div>
        </section>

        {/* Tabella Prenotazioni */}
        <section style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "24px", marginBottom: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", color: "#2d3748" }}>📋 Registro Prenotazioni</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#718096" }}>Tutte le prenotazioni gestite in automatico dall'Agente WhatsApp o inserite manualmente.</p>
            </div>
          </div>

          {restaurant.bookings.length === 0 ? (
            <p style={{ color: "#a0aec0", textAlign: "center", padding: "20px" }}>Nessuna prenotazione trovata a database.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #edf2f7", color: "#718096", fontSize: "12px", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px" }}>Cliente</th>
                    <th style={{ padding: "12px" }}>Telefono</th>
                    <th style={{ padding: "12px" }}>Data</th>
                    <th style={{ padding: "12px" }}>Ora</th>
                    <th style={{ padding: "12px" }}>Ospiti</th>
                    <th style={{ padding: "12px" }}>Stato</th>
                    <th style={{ padding: "12px" }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurant.bookings.map((b) => {
                    const isConfirmed = b.status === "CONFIRMED";
                    const isCancelled = b.status === "CANCELLED";

                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                        <td style={{ padding: "12px", fontWeight: "bold", color: "#2d3748" }}>{b.customer.name || "Cliente"}</td>
                        <td style={{ padding: "12px", color: "#4a5568" }}>{b.customer.whatsappPhone}</td>
                        <td style={{ padding: "12px", color: "#2d3748" }}>📅 {b.date}</td>
                        <td style={{ padding: "12px", color: "#2d3748" }}>⏰ {b.time}</td>
                        <td style={{ padding: "12px", color: "#2d3748" }}>👥 {b.guests}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              backgroundColor: isConfirmed ? "#c6f6d5" : isCancelled ? "#fed7d7" : "#edf2f7",
                              color: isConfirmed ? "#22543d" : isCancelled ? "#9b2c2c" : "#4a5568",
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px", color: "#718096", fontSize: "13px" }}>{b.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Configurazione Agente & Orari */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
          {/* Configurazione Agente IA */}
          <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#2d3748" }}>🤖 Personalità Agente IA</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              <div><strong>Nome Assistente:</strong> {restaurant.agentPersona?.agentName || "Mia"}</div>
              <div><strong>Tono di Voce:</strong> {restaurant.agentPersona?.tone || "Cordiale"}</div>
              <div><strong>Emoji:</strong> {restaurant.agentPersona?.emojiEnabled ? "Attive ✅" : "Disattivate ❌"}</div>
              <div><strong>Capienza per Slot:</strong> {restaurant.settings?.maxCapacityPerSlot || 40} coperti</div>
              <div><strong>Durata Slot:</strong> {restaurant.settings?.slotDurationMinutes || 90} minuti</div>
              <div><strong>Regole Speciali:</strong> {restaurant.agentPersona?.customRules || "Nessuna regola speciale inserita."}</div>
            </div>
          </div>

          {/* Orari di Apertura */}
          <div style={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#2d3748" }}>🕒 Orari e Turni Settimanali</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"].map((dayName, idx) => {
                const dayShifts = restaurant.hours.filter((h) => h.dayOfWeek === idx);
                const isClosed = dayShifts.length === 0 || dayShifts.every((h) => h.isClosed);

                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f7fafc", paddingBottom: "4px" }}>
                    <span style={{ fontWeight: "bold", color: "#4a5568" }}>{dayName}:</span>
                    <span style={{ color: isClosed ? "#e53e3e" : "#2f855a" }}>
                      {isClosed
                        ? "Chiuso"
                        : dayShifts
                            .filter((h) => !h.isClosed)
                            .map((h) => `${h.openTime}-${h.closeTime}`)
                            .join(" / ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
