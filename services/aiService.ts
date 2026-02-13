
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ChatMessage } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const DEFAULT_REASONING_MODEL = 'gemini-3-flash-preview';
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const aiService = {
  async performOCR(base64Data: string, mimeType: string) {
    const ai = getAI();
    const model = DEFAULT_REASONING_MODEL;
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Analyze this administrative document or image for a Belgian government agency. 1. Extract the full text accurately. 2. Identify key data points (Type, Date, NISS, Entity). 3. Brief 1-sentence summary. Format as JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullText: { type: Type.STRING },
            documentType: { type: Type.STRING },
            date: { type: Type.STRING },
            niss: { type: Type.STRING },
            entity: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["fullText"]
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return { fullText: response.text || "OCR Error" };
    }
  },

  async ingestUrl(url: string) {
    const ai = getAI();
    const model = DEFAULT_REASONING_MODEL;
    
    // Using Google Search grounding to "fetch" the URL content and summarize it for RAG
    const response = await ai.models.generateContent({
      model,
      contents: `Ingest and summarize the administrative and governance content of this URL for the Belgian Government RAG system: ${url}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            mainTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            administrativeContext: { type: Type.STRING }
          },
          required: ["title", "summary"]
        }
      }
    });

    try {
      const data = JSON.parse(response.text || '{}');
      return {
        ...data,
        fullText: `${data.title}\n\nSummary: ${data.summary}\n\nTopics: ${data.mainTopics?.join(', ')}\n\nContext: ${data.administrativeContext}`
      };
    } catch (e) {
      return { title: "Web Resource", fullText: response.text, summary: "Extracted from search grounding." };
    }
  },

  async chatWithRAG(query: string, contextDocs: any[], history: ChatMessage[] = []) {
    const ai = getAI();
    const model = DEFAULT_REASONING_MODEL;
    
    const contextText = contextDocs.map(d => `[TYPE: ${d.sourceType.toUpperCase()}, ID: ${d.id}, Title: ${d.title}] Content: ${d.text}`).join('\n\n');
    const historyText = history.slice(-10).map(m => `${m.role === 'user' ? 'OFFICER' : 'EBURON'}: ${m.content}`).join('\n');
    
    const response = await ai.models.generateContent({
      model,
      contents: `REFERENCE KNOWLEDGE BASE:\n${contextText}\n\nRECENT DIALOGUE:\n${historyText}\n\nOFFICER QUERY:\n${query}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nCRITICAL: Answer based on the provided reference knowledge (uploads/URLs). Always cite your source.",
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

  async textToSpeech(text: string): Promise<string> {
    const ai = getAI();
    const model = DEFAULT_TTS_MODEL;
    
    // Enforcing Flemish nuance in the TTS prompt
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Say in Dutch (Vlaamse nuance): ${text}` }] }],
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
    if (!base64Audio) throw new Error("Audio failure");
    
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
          { text: "Transcribe this audio accurately. Belgian context." }
        ]
      }
    });

    return response.text;
  }
};
