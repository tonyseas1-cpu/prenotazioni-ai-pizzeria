export interface InboundWhatsAppMessage {
  from: string; // Numero di telefono del cliente (es: "393401234567")
  name?: string; // Nome profilo WhatsApp
  messageId: string;
  text: string;
  timestamp: number;
  phoneNumberId: string; // ID numero del ristorante
}

export interface OutboundWhatsAppMessage {
  to: string;
  text: string;
  phoneNumberId?: string;
  accessToken?: string;
}

export interface IWhatsAppProvider {
  sendMessage(msg: OutboundWhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
