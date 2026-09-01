import React from "react";

export default function HomePage() {
  return (
    <main style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ color: "#1a202c" }}>🍕 Platform SaaS - AI Restaurant Agent</h1>
      <p style={{ color: "#4a5568" }}>
        Pannello di controllo Multi-Tenant per la gestione dei ristoranti e dell'Agente WhatsApp.
      </p>
      
      <div style={{ marginTop: "30px", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h3>Stato Sistema:</h3>
        <ul>
          <li><strong>Multi-Tenant Layer:</strong> Attivo (Prisma ORM)</li>
          <li><strong>Auth Engine:</strong> Pronto per la FASE 4</li>
          <li><strong>WhatsApp Agent Engine:</strong> Operativo in modalità Demo</li>
        </ul>
      </div>
    </main>
  );
}