/**
 * Xolo LaTeX Editor - OpenClaw Integration Client
 * 
 * This module provides a simple client for AI agents to interact with
 * the Xolo LaTeX Editor via its API.
 * 
 * Usage:
 *   import { XoloLatexClient } from './lib/xolo-latex-client';
 *   
 *   const client = new XoloLatexClient({
 *     baseUrl: 'https://xolo-latex-editor.vercel.app',
 *     apiKey: 'your-anthropic-api-key'
 *   });
 *   
 *   // Compile LaTeX to PDF
 *   const pdf = await client.compile(files);
 *   
 *   // Get project documents
 *   const docs = await client.getDocuments(projectId);
 */

export interface LaTeXFile {
  path: string;
  content: string;
}

export interface CompileResult {
  pdf?: string; // base64 encoded PDF
  size?: number;
  error?: string;
  debugInfo?: any;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export class XoloLatexClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: { baseUrl: string; apiKey: string }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  /**
   * Compile LaTeX files to PDF
   */
  async compile(files: LaTeXFile[], lastModifiedFile?: string): Promise<CompileResult> {
    const response = await fetch(`${this.baseUrl}/api/agent/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        files,
        lastModifiedFile: lastModifiedFile || files[0]?.path || 'main.tex',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error || 'Compilation failed' };
    }

    return await response.json();
  }

  /**
   * Compile LaTeX content string to PDF
   */
  async compileContent(content: string, filename = 'main.tex'): Promise<CompileResult> {
    return this.compile([{ path: filename, content }], filename);
  }

  /**
   * Get all documents for a user (requires auth)
   */
  async getDocuments(): Promise<Document[]> {
    const response = await fetch(`${this.baseUrl}/api/documents`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get documents: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get a specific document
   */
  async getDocument(documentId: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/api/documents/${documentId}`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get document: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Save a document
   */
  async saveDocument(projectId: string, title: string, content: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        project_id: projectId,
        title,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save document: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/api/agent/compile`, {
      method: 'GET',
    });
    return await response.json();
  }
}

/**
 * Helper function to create a client from environment variables
 */
export function createXoloClient(): XoloLatexClient {
  const baseUrl = process.env.XOLO_LATEX_URL || 'https://xolo-latex-editor.vercel.app';
  const apiKey = process.env.XOLO_LATEX_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('API key required. Set XOLO_LATEX_API_KEY or ANTHROPIC_API_KEY');
  }

  return new XoloLatexClient({ baseUrl, apiKey });
}

export default XoloLatexClient;
