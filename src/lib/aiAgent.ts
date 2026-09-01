import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  throw new Error("⚠️ GEMINI_API_KEY non trovata o vuota nel file .env!");
}

const genAI = new GoogleGenerativeAI(apiKey);

// 1. Definizione dei Tool per Gemini
const checkAvailabilityTool: FunctionDeclaration = {
  name: "checkAvailability",
  description: "Verifica la disponibilità reale nel database per data, ora e numero di persone.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description: "Data della prenotazione nel formato YYYY-MM-DD",
      },
      time: {
        type: SchemaType.STRING,
        description: "Orario richiesto nel formato 24 ore HH:mm (es. 20:00, 21:00)",
      },
      guests: {
        type: SchemaType.NUMBER,
        description: "Numero di persone",
      },
    },
    required: ["date", "time", "guests"],
  },
};

const createBookingTool: FunctionDeclaration = {
  name: "createBooking",
  description: "Crea la prenotazione nel database solo dopo la conferma esplicita del cliente.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customerName: {
        type: SchemaType.STRING,
        description: "Nome del cliente",
      },
      customerPhone: {
        type: SchemaType.STRING,
        description: "Numero di telefono del cliente",
      },
      date: {
        type: SchemaType.STRING,
        description: "Data YYYY-MM-DD",
      },
      time: {
        type: SchemaType.STRING,
        description: "Ora HH:mm",
      },
      guests: {
        type: SchemaType.NUMBER,
        description: "Numero di persone",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Note opzionali (es. allergie, seggioloni, animali)",
      },
    },
    required: ["customerName", "date", "time", "guests"],
  },
};

export const agentTools = [checkAvailabilityTool, createBookingTool];

// 2. Funzione principale dell'Agente con System Prompt
export async function processUserMessage(
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  restaurantContext: { name: string; timezone: string; currentDate: string }
) {
  const systemInstruction = `
Sei l'assistente IA del ristorante "${restaurantContext.name}".
Il tuo compito è aiutare i clienti a prenotare un tavolo in modo cordiale, professionale e sintetico.

REGOLE DI COMPRENSIONE LINGUAGGIO NATURALE ED ORARI:
1. NORMALIZZAZIONE ORARI:
   - Se il cliente inserisce l'ora a singola cifra ("8", "9", "10") o in lettere ("otto", "nove", "dieci"):
     * Interpreta per la cena: 8/otto -> 20:00; 9/nove -> 21:00; 10/dieci -> 22:00.
     * Se c'è ambiguità, chiedi rapida conferma dell'orario in formato 24h.
   - Converti espressioni colloquiali ("otto e mezza", "nove e un quarto", "verso le 9") nel formato HH:mm corretto (20:30, 21:15, 21:00).

2. NON-HALLUCINATION RULE:
   - NON inventare MAI la disponibilità di tavoli o gli orari.
   - Quando raccogli data, orario e coperti, DEVI invocare il tool 'checkAvailability'.

3. CONFERMA E REGISTRAZIONE:
   - Invoica 'createBooking' SOLO DOPO che il cliente ha confermato esplicitamente il riepilogo.

Data odierna di riferimento: ${restaurantContext.currentDate}. Timezone: ${restaurantContext.timezone}.
`;

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction,
    tools: [{ functionDeclarations: agentTools }],
  });

  const chat = model.startChat({ history });

  // Retry automatico in caso di errore 503 di Google
  let result;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      result = await chat.sendMessage(userMessage);
      break;
    } catch (err: any) {
      attempts++;
      if (err?.status === 503 && attempts < maxAttempts) {
        console.log(`\n⚠️ Server Google occupato (503). Attendo 2 secondi... (Tentativo ${attempts}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        throw err;
      }
    }
  }

  if (!result) {
    throw new Error("Impossibile ottenere una risposta dal modello dopo diversi tentativi.");
  }

  const response = result.response;
  const functionCalls = response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const call = functionCalls[0];
    return {
      type: "TOOL_CALL" as const,
      name: call.name,
      args: call.args,
    };
  }

  return {
    type: "TEXT" as const,
    text: response.text(),
  };
}