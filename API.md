# 🔌 Specifiche API REST (API.md)

Tutti gli endpoint applicativi risiedono sotto il prefisso `/api/v1/`.

---

### 1. Webhook WhatsApp
- **GET `/api/v1/webhooks/whatsapp`**
  - Verifica handshake Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- **POST `/api/v1/webhooks/whatsapp`**
  - Ricezione payload messaggi Meta Cloud API e orchestrazione della risposta IA.

---

### 2. Chat Demo
- **POST `/api/v1/chat`**
  - **Body**:
    ```json
    {
      "message": "Vorrei un tavolo per 4 domani alle 20:30",
      "customerPhone": "+393401234567",
      "customerName": "Marco Rossi"
    }
    ```
  - **Response**: Risposta testuale dell'agente con dettagli su eventuali tool eseguiti.

---

### 3. Prenotazioni
- **GET `/api/v1/bookings?slug=pizzeria-la-bella-chieri&date=2026-09-05`**
  - Restituisce la lista delle prenotazioni filtrate per data o stato.
- **POST `/api/v1/bookings`**
  - Creazione manuale prenotazione da dashboard.
- **PATCH `/api/v1/bookings`**
  - Modifica stato o dettagli prenotazione.
- **DELETE `/api/v1/bookings?id={bookingId}`**
  - Cancellazione prenotazione.

---

### 4. Disponibilità
- **GET `/api/v1/availability?slug=pizzeria-la-bella-chieri&date=2026-09-05&time=20:30&guests=4`**
  - Restituisce la disponibilità o le alternative orarie consigliate.
