import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", fontFamily: "Segoe UI, -apple-system, sans-serif" }}>
      <header style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "32px" }}>🍕</span>
          <span style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "-0.5px" }}>Prenotazioni AI SaaS</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <Link
            href="/demo"
            style={{
              padding: "10px 20px",
              backgroundColor: "#25d366",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            💬 Prova Simulatore Demo
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            📊 Accedi alla Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "900px", margin: "40px auto", padding: "0 20px", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "6px 16px", backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "20px", color: "#60a5fa", fontSize: "13px", fontWeight: "bold", marginBottom: "20px" }}>
          ✨ SaaS Multi-Tenant per Ristoranti con Agente WhatsApp AI
        </div>

        <h1 style={{ fontSize: "44px", fontWeight: "800", lineHeight: 1.2, margin: "0 0 20px 0" }}>
          Gestisci le prenotazioni dei tavoli in automatico su WhatsApp con l'Intelligenza Artificiale
        </h1>

        <p style={{ fontSize: "18px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 40px 0" }}>
          Un motore deterministico anti-overbooking integrato con Google Gemini per conversazioni naturali,
          gestione turni di pranzo/cena, capienza in tempo reale, modifiche, cancellazioni e handoff umano.
        </p>

        {/* Feature Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", textAlign: "left", marginTop: "50px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🤖</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Agente AI Intelligente</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5 }}>
              Comprende il linguaggio naturale italiano, abbreviazioni, orari parlati ("9 e mezza", "domani sera") e risponde con personalità su misura.
            </p>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚡</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Anti-Overbooking Atomico</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5 }}>
              Verifica deterministica di capienza, turni e finestre di durata tavolo su database relazionale PostgreSQL Neon con transazioni protette.
            </p>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🏢</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px" }}>Architettura Multi-Tenant</h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5 }}>
              Isolamento completo dei dati per centinaia di ristoranti, gestione orari personalizzati, piani tariffari SaaS e log di audit.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
