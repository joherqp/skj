import { GoogleGenAI } from "@google/genai";

export const getGeminiModel = () => {
  return "gemini-3.1-pro-preview"; // Upgraded to pro for better reasoning
};

export const createAIInstance = () => {
  // The platform injects the selected key into process.env.API_KEY
  // We also check GEMINI_API_KEY for backward compatibility or default environment keys
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return a proxy or a dummy object that fails gracefully at runtime but doesn't crash the build
    return {
      getGenerativeModel: () => ({
        startChat: () => ({
          sendMessage: async () => ({ response: { text: () => "API Key belum diatur." } })
        })
      })
    } as any;
  }

  return new GoogleGenAI({ apiKey });
};

// For backward compatibility — createAIInstance handles missing API key gracefully
export const ai = createAIInstance();
