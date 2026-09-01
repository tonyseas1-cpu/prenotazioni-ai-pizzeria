# 📘 Guida di Installazione e Setup (SETUP.md)

Questa guida illustra ogni passaggio necessario per avviare il progetto.

---

### Step 1: Configurazione delle Variabili d'Ambiente
1. All'interno della cartella principale del progetto, individua il file `.env`.
2. Assicurati che contenga le chiavi corrette:
   - `DATABASE_URL`: La stringa di connessione a Neon PostgreSQL.
   - `GEMINI_API_KEY`: La tua chiave API Gemini.

### Step 2: Generazione del Client Prisma e Popolamento Dati
Esegui nel terminale:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```
Questo comando creerà automaticamente tutte le tabelle nel database Neon e inserirà i dati del ristorante pilota (*Pizzeria La Bella Chieri*).

### Step 3: Avvio dell'Applicazione
```bash
npm run dev
```

### Step 4: Prova del Sistema
1. Apri Google Chrome o il tuo browser preferito.
2. Vai all'indirizzo `http://localhost:3000/demo`.
3. Invia un messaggio di prova (ad esempio: *"Vorrei un tavolo per 4 persone domani sera alle 20:30"*).
4. Verifica che Mia risponda e che la prenotazione compaia istantaneamente nella colonna di destra e nella Dashboard su `http://localhost:3000/dashboard`.
