import { NextRequest, NextResponse } from 'next/server';
import { androidAuditPrompt } from '@/lib/android-prompts';
import type { AndroidAuditReport } from '@/lib/android-report-template';

export async function POST(req: NextRequest) {
  try {
    const { apkData, claudeApiKey, analysisType = 'full' } = await req.json();

    if (!claudeApiKey) {
      return NextResponse.json(
        { error: 'Claude API key required' },
        { status: 400 }
      );
    }

    // Analyze Android app
    const report = await analyzeAndroidApp(apkData, claudeApiKey, analysisType);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Android audit error:', error);
    return NextResponse.json(
      { error: 'Audit failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function analyzeAndroidApp(
  apkData: any,
  apiKey: string,
  analysisType: string
): Promise<AndroidAuditReport> {
  // Call Claude API with Android-specific prompt
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${androidAuditPrompt}\n\nApp Data: ${JSON.stringify(apkData, null, 2)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON response
  const report: AndroidAuditReport = JSON.parse(content);
  report.analyzedAt = new Date().toISOString();

  return report;
}
