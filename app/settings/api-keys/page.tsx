'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Eye, EyeOff, Key, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApiKeysPage() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [compileUrl, setCompileUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/user-settings/api-keys', {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anthropicApiKey) {
          setAnthropicKey(data.anthropicApiKey);
          setHasKey(true);
        }
        if (data.compileServiceUrl) {
          setCompileUrl(data.compileServiceUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveApiKeys() {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user-settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          anthropicApiKey: anthropicKey,
          compileServiceUrl: compileUrl 
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'API keys saved successfully!' });
        setHasKey(!!anthropicKey);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API keys. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Configure your own API keys for AI features. Your keys are stored securely and never shared.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Anthropic API Key
            </CardTitle>
            <CardDescription>
              Required for AI chat features. Get your key from{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                anthropic.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="anthropic-key"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-ant-api03-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {hasKey && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>API key configured</span>
                  </>
                )}
              </div>
              <Button onClick={saveApiKeys} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloud PDF Compile</CardTitle>
            <CardDescription>
              Configure an external PDF compile service for cloud deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compile-url">Compile Service URL</Label>
              <Input
                id="compile-url"
                placeholder="https://your-compile-service.com (optional)"
                value={compileUrl}
                onChange={(e) => setCompileUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use local compilation when available.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Agent Access</CardTitle>
            <CardDescription>
              Use these credentials to allow AI agents to access your editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Agent API Endpoint</Label>
              <code className="block p-3 rounded bg-background text-sm">
                POST /api/agent/compile
              </code>
              <p className="text-sm text-muted-foreground">
                Send JSON with <code>files</code> array and <code>x-api-key</code> header for authentication.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
