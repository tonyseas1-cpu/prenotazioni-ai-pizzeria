import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const getRestaurantInfoTool: FunctionDeclaration = {
  name: "getRestaurantInfo",
  description: "Recupera le informazioni generali del ristorante (indirizzo, telefono, descrizione, regole speciali).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const getOpeningHoursTool: FunctionDeclaration = {
  name: "getOpeningHours",
  description: "Recupera gli orari di apertura e i turni (pranzo/cena/chiusure) del ristorante.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description: "Data facoltativa YYYY-MM-DD per verificare orari specifici o chiusure straordinarie.",
      },
    },
  },
};

export const checkAvailabilityTool: FunctionDeclaration = {
  name: "checkAvailability",
  description: "Verifica la disponibilità reale di un tavolo nel database per una specifica data, orario e numero di persone.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description: "Data della prenotazione nel formato YYYY-MM-DD (es. 2026-09-05)",
      },
      time: {
        type: SchemaType.STRING,
        description: "Orario nel formato 24 ore HH:mm (es. 13:00, 20:30, 21:00)",
      },
      guests: {
        type: SchemaType.NUMBER,
        description: "Numero totale di persone / coperti (es. 2, 4, 6)",
      },
    },
    required: ["date", "time", "guests"],
  },
};

export const getAvailableTimesTool: FunctionDeclaration = {
  name: "getAvailableTimes",
  description: "Restituisce gli orari disponibili alternativi per una specifica data e numero di ospiti.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description: "Data nel formato YYYY-MM-DD",
      },
      guests: {
        type: SchemaType.NUMBER,
        description: "Numero di ospiti",
      },
      targetTime: {
        type: SchemaType.STRING,
        description: "Orario preferito HH:mm attorno al quale cercare alternative",
      },
    },
    required: ["date", "guests"],
  },
};

export const createBookingTool: FunctionDeclaration = {
  name: "createBooking",
  description: "Crea e conferma la prenotazione nel database solo DOPO che il cliente ha confermato esplicitamente il riepilogo.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customerName: {
        type: SchemaType.STRING,
        description: "Nome e cognome del cliente per la prenotazione",
      },
      customerPhone: {
        type: SchemaType.STRING,
        description: "Numero di telefono del cliente (obbligatorio)",
      },
      date: {
        type: SchemaType.STRING,
        description: "Data confermata YYYY-MM-DD",
      },
      time: {
        type: SchemaType.STRING,
        description: "Orario confermato HH:mm (24h)",
      },
      guests: {
        type: SchemaType.NUMBER,
        description: "Numero di persone",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Note opzionali (allergie, seggiolone, preferenza tavolo, ecc.)",
      },
    },
    required: ["customerName", "customerPhone", "date", "time", "guests"],
  },
};

export const getCustomerBookingsTool: FunctionDeclaration = {
  name: "getCustomerBookings",
  description: "Recupera le prenotazioni attive del cliente tramite il suo numero di telefono per consultazione, modifica o cancellazione.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customerPhone: {
        type: SchemaType.STRING,
        description: "Numero di telefono del cliente",
      },
    },
    required: ["customerPhone"],
  },
};

export const modifyBookingTool: FunctionDeclaration = {
  name: "modifyBooking",
  description: "Modifica data, orario, numero persone o note di una prenotazione esistente.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      bookingId: {
        type: SchemaType.STRING,
        description: "ID della prenotazione da modificare",
      },
      newDate: {
        type: SchemaType.STRING,
        description: "Nuova data YYYY-MM-DD (se modificata)",
      },
      newTime: {
        type: SchemaType.STRING,
        description: "Nuovo orario HH:mm (se modificato)",
      },
      newGuests: {
        type: SchemaType.NUMBER,
        description: "Nuovo numero di ospiti (se modificato)",
      },
      newNotes: {
        type: SchemaType.STRING,
        description: "Nuove note",
      },
    },
    required: ["bookingId"],
  },
};

export const cancelBookingTool: FunctionDeclaration = {
  name: "cancelBooking",
  description: "Cancella una prenotazione esistente dopo la conferma del cliente.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      bookingId: {
        type: SchemaType.STRING,
        description: "ID della prenotazione da cancellare",
      },
      reason: {
        type: SchemaType.STRING,
        description: "Motivo della cancellazione (opzionale)",
      },
    },
    required: ["bookingId"],
  },
};

export const handoffToHumanTool: FunctionDeclaration = {
  name: "handoffToHuman",
  description: "Trasferisce la conversazione a un operatore umano dello staff del ristorante per richieste complesse o problemi.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reason: {
        type: SchemaType.STRING,
        description: "Motivo del passaggio all'operatore umano",
      },
    },
    required: ["reason"],
  },
};

export const aiAgentTools: FunctionDeclaration[] = [
  getRestaurantInfoTool,
  getOpeningHoursTool,
  checkAvailabilityTool,
  getAvailableTimesTool,
  createBookingTool,
  getCustomerBookingsTool,
  modifyBookingTool,
  cancelBookingTool,
  handoffToHumanTool,
];
