import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user settings from database
    const { data, error } = await supabase
      .from('user_settings')
      .select('anthropic_api_key, compile_service_url')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch user settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({
      anthropicApiKey: (data as any)?.anthropic_api_key || '',
      compileServiceUrl: (data as any)?.compile_service_url || '',
    });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { anthropicApiKey, compileServiceUrl } = body;

    // Upsert user settings
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: session.user.id,
          anthropic_api_key: anthropicApiKey || null,
          compile_service_url: compileServiceUrl || null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to save user settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
