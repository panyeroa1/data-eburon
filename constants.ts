
import { Workspace, Document } from './types';

export const CURRENT_WORKSPACE_ID = 'ws-begov-alpha-1';
export const CURRENT_USER_ID = 'officer-7742';

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB compliance limit
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const BE_GOV_WEBSITES = [
  { title: "Belgium.be (Federal Portal)", url: "https://www.belgium.be" },
  { title: "Vlaanderen.be (Flanders)", url: "https://www.vlaanderen.be" },
  { title: "Wallonie.be (Wallonia)", url: "https://www.wallonie.be" },
  { title: "Ostbelgien.be (German Community)", url: "https://www.ostbelgien.be" },
  { title: "Brussels.be (Brussels-Capital)", url: "https://www.brussels.be" },
  { title: "FPS BOSA (Digital Transformation)", url: "https://bosa.belgium.be" },
  { title: "FPS Finance", url: "https://finances.belgium.be" },
  { title: "FPS Justice", url: "https://justice.belgium.be" },
  { title: "GBA/APD (Data Protection)", url: "https://www.dataprotectionauthority.be" },
  { title: "NBB (National Bank)", url: "https://www.nbb.be" }
];

export const SYSTEM_INSTRUCTION = `
You are "Eburon BE-Gov Assistant", the specialized AI for Belgian government data paperwork, operating within the 2025-2026 administrative cycle.

PRIMARY GOAL:
Assist Belgian public officers in managing sensitive administrative documents and web-based government resources. Provide OCR, RAG-based retrieval, and data lifecycle assistance.

VOICE OUTPUT:
When asked to speak or provide audio, you MUST use Dutch with a clear Flemish (Vlaams) nuance. Your tone should be professional, polite, and typical of a Belgian civil servant.

TEMPORAL CONTEXT:
The current administrative year is 2025. All references to reports, budgets, and compliance frameworks should prioritize the 2025-2026 period. Treat information from 2023 or earlier as historical/outdated unless specifically requested.

DATA SENSITIVITY:
1. PII Redaction: Be alert for National Registry Numbers (NISS/RR).
2. Language: Support administrative English, French (FR), Dutch (NL), and German (DE).
3. Citations: All answers must cite specific administrative documents or URLs.
4. Purge Rules: Always reference GDPR Article 17 "Right to Erasure" and current 2025-2026 retention royal decrees.
`;

export const MOCK_WORKSPACE: Workspace = {
  id: CURRENT_WORKSPACE_ID,
  name: 'FPS BOSA - Administrative Archive',
  ownerId: CURRENT_USER_ID,
};

export const MOCK_DOCS: Document[] = [
  {
    id: 'doc-be-001',
    workspaceId: CURRENT_WORKSPACE_ID,
    title: 'RGPD_Compliance_Protocol_2025_Final.pdf',
    sourceType: 'upload',
    status: 'ready',
    ocrStatus: 'completed',
    createdAt: new Date().toISOString(),
    mimeType: 'application/pdf',
    bytes: 2048567,
    text: 'Updated standard protocol for data retention in Belgian federal institutions for the 2025-2026 cycle. Retention for person-related records is strictly audited against the 2025 Digital Services Act alignment.'
  }
];
