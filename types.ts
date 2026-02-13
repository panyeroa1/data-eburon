
export type SourceType = 'upload' | 'url' | 'manual';
export type DocStatus = 'new' | 'processing' | 'ready' | 'error';
export type OCRStatus = 'pending' | 'completed' | 'failed' | 'not_required';
export type PurgeStatus = 'pending' | 'dry_run' | 'executing' | 'completed' | 'failed';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  sourceType: SourceType;
  status: DocStatus;
  ocrStatus: OCRStatus;
  createdAt: string;
  mimeType: string;
  bytes: number;
  text?: string;
  protected?: boolean;
  extractedData?: {
    documentType?: string;
    date?: string;
    niss?: string;
    entity?: string;
    summary?: string;
    [key: string]: any;
  };
}

export interface Chunk {
  id: string;
  documentId: string;
  pageIndex?: number;
  text: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: any;
  createdAt: string;
}

export interface PurgeJob {
  id: string;
  workspaceId: string;
  mode: 'dry_run' | 'execute';
  filter: any;
  status: PurgeStatus;
  results?: {
    docCount: number;
    chunkCount: number;
    blobCount: number;
  };
  createdAt: string;
}

export interface Citation {
  documentId: string;
  title: string;
  page?: number;
  chunkId?: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  audioUrl?: string;
  isStreaming?: boolean;
}
