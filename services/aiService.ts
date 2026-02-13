
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ChatMessage } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Sovereign cloud models
const DEFAULT_REASONING_MODEL = 'gemini-3-flash-preview';
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const aiService = {
  async chatWithRAG(query: string, contextDocs: any[], history: ChatMessage[] = []) {
    const ai = getAI();
    const model = DEFAULT_REASONING_MODEL;
    
    // Prepare prompt with both document context and persistent chat "reference" data
    const contextText = contextDocs.map(d => `[TYPE: ${d.sourceType.toUpperCase()}, ID: ${d.id}, Title: ${d.title}] Content: ${d.text}`).join('\n\n');
    
    // Include last few messages as part of the knowledge reference
    const historyText = history.slice(-10).map(m => `${m.role === 'user' ? 'OFFICER' : 'EBURON'}: ${m.content}`).join('\n');
    
    const response = await ai.models.generateContent({
      model,
      contents: `REFERENCE KNOWLEDGE BASE (OFFICIAL UPLOADS & MANUAL INPUTS):
${contextText}

RECENT ADMINISTRATIVE DIALOGUE (REFERENCE):
${historyText}

OFFICER CURRENT QUERY:
${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nCRITICAL: Use all provided reference data (uploads and interaction history) as the primary source of truth. If information exists in previous user inputs or uploads, treat it as validated knowledge.",
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
      console.error("Infrastructure processing error");
      return { answer: response.text, citations: [] };
    }
  },

  async analyzeImage(base64Image: string, prompt: string) {
    const ai = getAI();
    const model = DEFAULT_IMAGE_MODEL;
    
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
    const model = DEFAULT_TTS_MODEL;
    
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
    if (!base64Audio) throw new Error("Audio synthesis infrastructure failure");
    
    return `data:audio/pcm;base64,${base64Audio}`;
  },

  async transcribeAudio(base64Audio: string, mimeType: string = 'audio/wav') {
    const ai = getAI();
    const model = DEFAULT_REASONING_MODEL;
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Transcribe this audio accurately for Belgian administrative records. If there are names or NISS numbers, ensure precision." }
        ]
      }
    });

    return response.text;
  }
};