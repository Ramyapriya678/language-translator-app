
import { GoogleGenAI, Modality } from "@google/genai";
import { Language } from "../types";

// Note: process.env.API_KEY is pre-configured in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function translateText(
  text: string,
  from: Language,
  to: Language
): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Translate the following text from ${from.name} (${from.nativeName}) to ${to.name} (${to.nativeName}).
Maintain the original tone, context, and nuance. Only return the translated text without any explanations or headers.

Text: ${text}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.1, // Low temperature for high precision translation
    }
  });

  return response.text || "";
}

export async function generateSpeech(text: string, languageCode: string): Promise<string> {
  // Use the TTS-specific model
  // Pre-configured voices: Kore, Puck, Charon, Fenrir, Zephyr
  const voiceName = languageCode === 'en' ? 'Zephyr' : 'Kore';
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || "";
}

export async function translateAudio(
  audioBase64: string,
  from: Language,
  to: Language
): Promise<{ originalText: string; translatedText: string }> {
  const model = 'gemini-3-flash-preview';

  const audioPart = {
    inlineData: {
      mimeType: 'audio/webm',
      data: audioBase64,
    },
  };

  const textPart = {
    text: `Identify the speech in this audio file in ${from.name}. Translate it to ${to.name}.
Return the result as a JSON object with two fields: "originalText" and "translatedText".
Example: {"originalText": "Hello", "translatedText": "Hola"}
Only return the JSON.`
  };

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [audioPart, textPart] },
    config: {
      responseMimeType: 'application/json'
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      originalText: data.originalText || "",
      translatedText: data.translatedText || "",
    };
  } catch (error) {
    console.error("Failed to parse audio translation response", error);
    return { originalText: "", translatedText: "" };
  }
}
