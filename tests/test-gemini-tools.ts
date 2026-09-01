import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiAgentTools } from "../src/core/ai/tools";
import { buildSystemPrompt } from "../src/core/ai/prompts";
import { ReservationEngine } from "../src/core/reservation/reservationEngine";

async function testGeminiToolFlow() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = buildSystemPrompt({
    restaurantName: "Pizzeria La Bella Chieri",
    timezone: "Europe/Rome",
    currentDate: "2026-09-01",
    agentName: "Mia",
    tone: "cordiale",
    emojiEnabled: true,
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // let's also test gemini-2.5-flash vs gemini-2.0-flash vs gemini-1.5-flash vs gemini-3.6-flash
    systemInstruction,
    tools: [{ functionDeclarations: aiAgentTools }],
  });

  const chat = model.startChat();
  console.log("Inviando: 'Vorrei un tavolo per 5 persone venerdì a pranzo verso le 13'");
  
  try {
    const res1 = await chat.sendMessage("Vorrei un tavolo per 5 persone venerdì a pranzo verso le 13");
    console.log("Candidate 1:", JSON.stringify(res1.response.candidates, null, 2));
    
    const functionCalls = res1.response.functionCalls();
    console.log("Function Calls:", functionCalls);

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResult = await ReservationEngine.getAvailableTimes("pizzeria-la-bella-chieri", "2026-09-04", 5, "13:00");
      console.log("Tool Result from DB:", toolResult);

      const res2 = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { availableTimes: toolResult },
          },
        },
      ]);
      console.log("Candidate 2:", JSON.stringify(res2.response.candidates, null, 2));
      console.log("Text 2:", res2.response.text());
    }
  } catch (e) {
    console.error("Errore test:", e);
  }
}

testGeminiToolFlow();
