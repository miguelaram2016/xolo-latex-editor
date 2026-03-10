import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { compileLatex } from '@/app/api/compile-pdf/compiler';
import type { CompileRequest } from '@/app/api/compile-pdf/types';

export const runtime = 'nodejs';
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

/**
 * Agent API for LaTeX compilation
 * 
 * Authentication via:
 * - Header: x-api-key (user's Anthropic API key stored in user_settings)
 * 
 * Request body:
 * {
 *   files: [{ path: string, content: string }],
 *   projectId?: string,
 *   lastModifiedFile?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required. Provide via x-api-key header.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    
    // Find user with matching API key
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, anthropic_api_key, compile_service_url')
      .eq('anthropic_api_key', apiKey)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Invalid API key. Please add your API key in Settings > API Keys.' },
        { status: 401 }
      );
    }

    const userSettings = settings as any;
    const body: Partial<CompileRequest> = await request.json();
    
    if (!body.files || !body.files.length) {
      return NextResponse.json(
        { error: 'No files provided. Include files array with path and content.' },
        { status: 400 }
      );
    }

    // Use user's custom compile service URL if set, otherwise try default
    const compileServiceUrl = userSettings.compile_service_url || process.env.COMPILE_SERVICE_URL;
    
    if (!compileServiceUrl) {
      return NextResponse.json(
        { 
          error: 'No compile service configured',
          suggestion: 'Add a compile service URL in Settings > API Keys, or set COMPILE_SERVICE_URL environment variable.'
        },
        { status: 503 }
      );
    }

    const compileResult = await compileLatex(
      body as CompileRequest,
      compileServiceUrl,
      apiKey // Use API key as session token substitute
    );

    if (!compileResult.success || !compileResult.base64PDF) {
      return NextResponse.json({
        error: compileResult.error?.error || 'LaTeX compilation failed',
        details: compileResult.error?.details,
        suggestion: compileResult.error?.suggestion || 'Check your LaTeX syntax',
      }, { status: 500 });
    }

    return NextResponse.json({
      pdf: compileResult.base64PDF,
      size: compileResult.pdfBuffer?.length,
      debugInfo: compileResult.durationMs ? { durationMs: compileResult.durationMs } : undefined,
    });

  } catch (error) {
    console.error('Agent compile error:', error);
    return NextResponse.json(
      { error: 'Compilation failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Xolo LaTeX Editor Agent API',
    version: '1.0.0',
    endpoints: {
      POST: '/api/agent/compile - Compile LaTeX files to PDF',
    },
    auth: 'Provide API key via x-api-key header',
    usage: {
      example: {
        files: [{ path: 'resume.tex', content: '\\documentclass{article}\\n\\begin{document}\\nHello\\n\\end{document}' }]
      }
    }
  });
}
