# 🍕 AI Restaurant Reservation Agent SaaS

Piattaforma SaaS Multi-Tenant per la gestione autonoma delle prenotazioni nei ristoranti tramite **WhatsApp Business API** e **Google Gemini AI**.

---

## 🌟 Caratteristiche Principali

- **Multi-Tenant Nativo**: Gestione centralizzata di molteplici ristoranti con isolamento totale di dati, clienti, prenotazioni e impostazioni.
- **Agente Conversazionale WhatsApp**: Dialogo fluido in italiano naturale con estrazione automatica di data, orari ("8 e mezza", "domani sera"), coperti e note.
- **Motore Deterministico Anti-Overbooking**: Calcolo accurato di capienza, orari e turni (pranzo/cena) direttamente su database PostgreSQL con transazioni atomiche.
- **Generatore di Alternative Intelligente**: Se l'orario richiesto è pieno o chiuso, l'agente suggerisce immediatamente gli slot disponibili più vicini.
- **Gestione Completa del Ciclo di Vita**: Prenotazione, consultazione, modifica, cancellazione e handoff automatico al personale umano in caso di necessità.
- **Simulatore WhatsApp Web (Demo Mode)**: Interfaccia interattiva per testare in tempo reale conversazioni e aggiornamenti DB senza configurare un account Meta.
- **Dashboard Ristorante in Tempo Reale**: Monitoraggio coperti, prenotazioni odierne e future, storico chat e configurazione orari/personalità IA.

---

## 🚀 Avvio Rapido

### 1. Prerequisiti
- Node.js 18+ installato
- Database PostgreSQL (es. Neon)
- Chiave API Google Gemini

### 2. Installazione dipendenze
```bash
npm install
```

### 3. Configurazione `.env`
Copia `.env.example` in `.env` e inserisci le tue credenziali:
```env
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="AIzaSy..."
```

### 4. Sincronizzazione Database & Seed
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Avvio Server di Sviluppo
```bash
npm run dev
```

Apri il browser su:
- **Simulatore Demo WhatsApp**: `http://localhost:3000/demo`
- **Dashboard Ristorante**: `http://localhost:3000/dashboard`
- **Home SaaS**: `http://localhost:3000`

---

## 📂 Documentazione Aggiuntiva

- [SETUP.md](./SETUP.md) - Guida passo-passo per utenti non tecnici.
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Dettagli sull'architettura pulita e multi-tenant.
- [API.md](./API.md) - Specifiche delle API REST `/api/v1/...`.
