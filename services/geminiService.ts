
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async chatWithRAG(query: string, contextDocs: any[]) {
    const ai = getAI();
    const model = 'gemini-3-flash-preview';
    
    // Prepare prompt with context
    const contextText = contextDocs.map(d => `[ID: ${d.id}, Title: ${d.title}] Text: ${d.text}`).join('\n\n');
    
    const response = await ai.models.generateContent({
      model,
      contents: `Context Documents:\n${contextText}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nUse the provided context documents to answer. If the answer is not in the context, say so.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            citations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  documentId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  snippet: { type: Type.STRING }
                },
                required: ["documentId", "title", "snippet"]
              }
            }
          },
          required: ["answer", "citations"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return { answer: response.text, citations: [] };
    }
  },

  async analyzeImage(base64Image: string, prompt: string) {
    const ai = getAI();
    const model = 'gemini-3-pro-image-preview';
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "You are an OCR and visual analysis specialist. Extract all text and describe visual data governance markers."
      }
    });

    return response.text;
  },

  async textToSpeech(text: string): Promise<string> {
    const ai = getAI();
    const model = 'gemini-2.5-flash-preview-tts';
    
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS failed");
    
    // Convert PCM to Blob for playing in browser - simpler approach for demo:
    // In a real scenario, use the decodeAudioData helper from guidelines.
    // For this UI, we return the base64 to be handled by a standard audio player or custom decoder.
    return `data:audio/pcm;base64,${base64Audio}`;
  },

  async transcribeAudio(base64Audio: string) {
    const ai = getAI();
    const model = 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType: 'audio/wav' } },
          { text: "Transcribe this audio accurately." }
        ]
      }
    });

    return response.text;
  }
};
