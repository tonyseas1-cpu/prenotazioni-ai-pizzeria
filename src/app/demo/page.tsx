"use client";

import React, { useState, useEffect, useRef } from "react";

interface MessageItem {
  id: string;
  sender: "customer" | "agent" | "system";
  text: string;
  timestamp: string;
  toolCalls?: { toolName: string; args: any; result: any }[];
}

export default function DemoPage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "1",
      sender: "agent",
      text: "👋 Ciao! Sono Mia, l'assistente virtuale di Pizzeria La Bella Chieri. Come posso aiutarti con la tua prenotazione?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("Marco Bianchi");
  const [customerPhone, setCustomerPhone] = useState("+393471122334");
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Carica le prenotazioni correnti del database
  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/v1/bookings?slug=pizzeria-la-bella-chieri");
      const data = await res.json();
      if (data.bookings) {
        setActiveBookings(data.bookings);
      }
    } catch (e) {
      console.error("Errore fetch bookings:", e);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputText;
    if (!message.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: Date.now().toString(),
      sender: "customer",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          customerPhone,
          customerName,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "system",
            text: `⚠️ Errore: ${data.error}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "agent",
            text: data.replyText || "Nessuna risposta testuale.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            toolCalls: data.toolCalls,
          },
        ]);
        // Aggiorna la tabella delle prenotazioni se è stato eseguito un tool
        await fetchBookings();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "system",
          text: `⚠️ Errore di rete: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Vorrei prenotare un tavolo per 4 domani alle 20:30",
    "Siamo in 2 stasera verso le 9",
    "Siamo in 15 per sabato sera",
    "Che orari fate il mercoledì?",
    "Vorrei spostare o cancellare la mia prenotazione",
    "Posso parlare con un membro dello staff?",
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Segoe UI, -apple-system, sans-serif", backgroundColor: "#e5ddd5" }}>
      {/* Colonna Sinistra: Chat WhatsApp Simulator */}
      <div style={{ flex: "1 1 65%", display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid #d1d7db", backgroundColor: "#efeae2" }}>
        {/* Header Chat */}
        <div style={{ padding: "12px 20px", backgroundColor: "#008069", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#25d366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
              🍕
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>Pizzeria La Bella Chieri</div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>Assistente IA (Mia) • Online</div>
            </div>
          </div>
          <div style={{ fontSize: "12px", backgroundColor: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "12px" }}>
            MODALITÀ DEMO WHATSAPP
          </div>
        </div>

        {/* Quick Prompts Bar */}
        <div style={{ padding: "8px 16px", backgroundColor: "#f0f2f5", borderBottom: "1px solid #e9edef", display: "flex", gap: "8px", overflowX: "auto" }}>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={isLoading}
              style={{
                fontSize: "12px",
                whiteSpace: "nowrap",
                padding: "6px 12px",
                borderRadius: "16px",
                border: "1px solid #008069",
                backgroundColor: "#fff",
                color: "#008069",
                cursor: "pointer",
              }}
            >
              💬 {p}
            </button>
          ))}
        </div>

        {/* Area Messaggi */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {messages.map((m) => {
            const isCustomer = m.sender === "customer";
            const isSystem = m.sender === "system";

            if (isSystem) {
              return (
                <div key={m.id} style={{ alignSelf: "center", backgroundColor: "#fed7d7", color: "#c53030", padding: "6px 12px", borderRadius: "8px", fontSize: "12px" }}>
                  {m.text}
                </div>
              );
            }

            return (
              <div
                key={m.id}
                style={{
                  alignSelf: isCustomer ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  backgroundColor: isCustomer ? "#d9fdd3" : "#ffffff",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "14px", color: "#111b21", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{m.text}</div>

                {/* Dettagli Tool Call se presenti */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div style={{ marginTop: "8px", padding: "6px 10px", backgroundColor: "#f0f2f5", borderRadius: "6px", fontSize: "11px", color: "#4a5568", borderLeft: "3px solid #008069" }}>
                    <div style={{ fontWeight: "bold", color: "#008069" }}>⚙️ Tool Eseguito: {m.toolCalls[0].toolName}</div>
                    <pre style={{ margin: "4px 0 0 0", fontSize: "10px", overflowX: "auto" }}>
                      {JSON.stringify(m.toolCalls[0].args, null, 2)}
                    </pre>
                  </div>
                )}

                <div style={{ fontSize: "10px", color: "#667781", textAlign: "right", marginTop: "4px" }}>{m.timestamp}</div>
              </div>
            );
          })}

          {isLoading && (
            <div style={{ alignSelf: "flex-start", backgroundColor: "#ffffff", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", color: "#667781" }}>
              ⏳ Mia sta scrivendo e verificando il database...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: "12px 20px", backgroundColor: "#f0f2f5", display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Scrivi un messaggio come cliente WhatsApp..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d7db",
              outline: "none",
              fontSize: "14px",
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            style={{
              padding: "12px 24px",
              backgroundColor: isLoading ? "#9ae6b4" : "#008069",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            Invia
          </button>
        </div>
      </div>

      {/* Colonna Destra: Pannello Info & Database Live */}
      <div style={{ flex: "1 1 35%", backgroundColor: "#ffffff", padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", color: "#1a202c", fontSize: "18px" }}>📊 Stato Database in Tempo Reale</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#718096" }}>Ristorante: <strong>Pizzeria La Bella Chieri</strong></p>
        </div>

        {/* Configurazione Utente Simulato */}
        <div style={{ backgroundColor: "#f7fafc", padding: "14px", borderRadius: "8px", border: "1px solid #edf2f7" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#2d3748", textTransform: "uppercase" }}>👤 Profilo Cliente Simulato</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "#718096" }}>Nome:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e0", fontSize: "12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "#718096" }}>Numero WhatsApp:</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #cbd5e0", fontSize: "12px" }}
              />
            </div>
          </div>
        </div>

        {/* Tabella Prenotazioni DB */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "13px", color: "#2d3748", textTransform: "uppercase" }}>📅 Prenotazioni a Database ({activeBookings.length})</h3>
            <button onClick={fetchBookings} style={{ fontSize: "11px", background: "none", border: "none", color: "#3182ce", cursor: "pointer" }}>🔄 Aggiorna</button>
          </div>

          {activeBookings.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#a0aec0" }}>Nessuna prenotazione attiva.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeBookings.map((b) => (
                <div key={b.id} style={{ padding: "10px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#2d3748" }}>
                    <span>{b.customer?.name || "Cliente"}</span>
                    <span style={{ color: b.status === "CONFIRMED" ? "#38a169" : "#e53e3e" }}>{b.status}</span>
                  </div>
                  <div style={{ color: "#4a5568", marginTop: "4px" }}>
                    📅 {b.date} alle ⏰ {b.time} • 👥 {b.guests} persone
                  </div>
                  {b.notes && <div style={{ color: "#718096", fontSize: "11px", marginTop: "2px" }}>Note: {b.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link Dashboard */}
        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #edf2f7" }}>
          <a
            href="/dashboard"
            style={{
              display: "block",
              textAlign: "center",
              padding: "10px",
              backgroundColor: "#2b6cb0",
              color: "#fff",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            📊 Vai alla Dashboard Ristorante
          </a>
        </div>
      </div>
    </div>
  );
}
