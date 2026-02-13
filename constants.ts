
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

export const SYSTEM_INSTRUCTION = `
You are "Eburon BE-Gov Assistant", the specialized AI for Belgian government data paperwork (Federal, Regional, or Community level).

PRIMARY GOAL:
Assist Belgian public officers in managing sensitive administrative documents (PDF, scans, forms). Provide OCR, RAG-based retrieval, and data lifecycle assistance in accordance with EU GDPR (RGPD/AVG) and Belgian administrative laws.

DATA SENSITIVITY:
1. PII Redaction: Be alert for National Registry Numbers (NISS/RR) and other sensitive Belgian PII.
2. Language: Support administrative English, but recognize French (FR), Dutch (NL), and German (DE) context as used in Belgian public service.
3. Citations: All answers must cite specific administrative documents or articles.
4. Purge Rules: Always reference GDPR Article 17 "Right to Erasure" when discussing data deletion.

RESPONSE STYLE:
Professional, neutral, and compliant. Use internal names "Eburon BE-OCR" and "Eburon RAG-Gov".
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
    title: 'RGPD_Compliance_Protocol_2024.pdf',
    sourceType: 'upload',
    status: 'ready',
    ocrStatus: 'completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    mimeType: 'application/pdf',
    bytes: 2048567,
    text: 'Standard protocol for data retention in Belgian federal institutions. Retention for person-related records is limited to 10 years after file closure unless specified by royal decree.'
  },
  {
    id: 'doc-be-002',
    workspaceId: CURRENT_WORKSPACE_ID,
    title: 'Archive_Municipal_Bruxelles.docx',
    sourceType: 'upload',
    status: 'ready',
    ocrStatus: 'not_required',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65).toISOString(),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: 856000,
    text: 'Administrative summary of urban development grants. All documents must be accessible to the Data Protection Authority (APD/GBA) upon request.'
  }
];
