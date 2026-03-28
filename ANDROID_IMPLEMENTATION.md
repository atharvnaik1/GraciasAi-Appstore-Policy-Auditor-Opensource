# Android Play Store Auditor - Implementation

**Issue**: #12  
**Bounty**: ₹2000  
**Status**: Implementation

---

## 📁 File Structure

```
src/
├── app/
│   └── api/
│       └── audit-android/
│           └── route.ts          # Android audit API endpoint
├── lib/
│   ├── android-prompts.ts        # Android-specific prompts
│   ├── android-report-template.ts # Report template
│   └── play-policies.ts          # Play Store policy references
.github/
└── ISSUE_TEMPLATE/
    └── android-compliance-issue.md
```

---

## 1. Play Store Policy References

**File**: `src/lib/play-policies.ts`

```typescript
export const playPolicies = {
  permissions: {
    url: 'https://developer.android.com/google/play/policies#permissions',
    dangerousPermissions: [
      'android.permission.SEND_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_SMS',
      'android.permission.READ_CALL_LOG',
      'android.permission.WRITE_CALL_LOG',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_PHONE_STATE',
      'android.permission.CAMERA',
    ],
    rules: {
      sms: 'SMS permissions only allowed for default SMS handlers',
      callLog: 'Call log permissions highly restricted',
      location: 'Must provide clear location usage disclosure',
    }
  },
  dataSafety: {
    url: 'https://support.google.com/googleplay/android-developer/answer/10787216',
    requirements: [
      'Disclose all data collected',
      'Explain how data is used',
      'List third-party data sharing',
      'Provide privacy policy URL',
    ]
  },
  ads: {
    url: 'https://developer.android.com/google/play/policies#ads',
    rules: [
      'No deceptive ad implementations',
      'Clear distinction between ads and content',
      'No accidental ad clicks',
      'Proper ad disclosure',
    ]
  },
  monetization: {
    url: 'https://play.google.com/about/developer-payment-policy/',
    rules: [
      'Use Google Play Billing for digital goods',
      'Clear pricing before purchase',
      'Easy refund process',
      'No hidden subscriptions',
    ]
  },
};

export function getPolicyReference(category: string, subcategory?: string): string {
  const policy = playPolicies[category as keyof typeof playPolicies];
  if (!policy) return playPolicies.permissions.url;
  return policy.url;
}
```

---

## 2. Android Audit Prompts

**File**: `src/lib/android-prompts.ts`

```typescript
export const androidAuditPrompt = `You are an expert Android app reviewer specializing in Google Play Store compliance.

Analyze the uploaded Android app for compliance issues.

## Analysis Areas

### 1. Permissions Analysis
Check for dangerous permissions:
- SMS permissions (SEND_SMS, RECEIVE_SMS, READ_SMS)
- Call log permissions (READ_CALL_LOG, WRITE_CALL_LOG)
- Contacts permissions (READ_CONTACTS, WRITE_CONTACTS)
- Location permissions (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION)
- Other sensitive permissions (RECORD_AUDIO, CAMERA, READ_PHONE_STATE)

For each permission, evaluate:
- Is the permission necessary for app functionality?
- Is there a clear justification?
- Could the app function with less invasive permissions?

### 2. Data Safety Compliance
Verify:
- All data collection is disclosed
- Data usage is clearly explained
- Third-party data sharing is listed
- Privacy policy is provided and accessible

### 3. Monetization & Ads
Check for:
- Deceptive ad implementations
- Accidental ad click mechanisms
- Unclear pricing
- Hidden subscriptions
- Proper use of Google Play Billing

### 4. Content Policy
Review for:
- Restricted content (violence, hate speech, etc.)
- User-generated content moderation
- Age-appropriate content
- Copyright violations

## Output Format

Generate a JSON report with this structure:

{
  "summary": "Brief overview of compliance status",
  "riskLevel": "Critical|High|Medium|Low",
  "issues": [
    {
      "title": "Clear issue title",
      "severity": "Critical|High|Medium|Low",
      "category": "permissions|dataSafety|ads|monetization|content",
      "policyReference": "URL to specific policy",
      "description": "What's wrong",
      "impact": "Why this may cause rejection",
      "evidence": "Specific findings",
      "remediation": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "recommendations": ["General recommendations"]
}

Be specific, actionable, and reference exact Play Store policies.`;

export const androidRemediationPrompt = `You are a senior Android developer helping fix compliance issues.

For each issue, provide:

1. **Code Changes** (if applicable)
   - Specific files to modify
   - Code snippets showing the fix
   - Alternative implementations

2. **Play Console Configuration**
   - Settings to update
   - Disclosures to add
   - Screenshots of correct configuration

3. **Policy-Compliant Alternatives**
   - Less invasive permission alternatives
   - Compliant monetization methods
   - Best practice implementations

4. **GitHub Issue Template**
   - Clear title
   - Problem description
   - Acceptance criteria
   - Testing instructions

Format as Markdown with clear sections.`;
```

---

## 3. Android Report Template

**File**: `src/lib/android-report-template.ts`

```typescript
export interface AndroidComplianceIssue {
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'permissions' | 'dataSafety' | 'ads' | 'monetization' | 'content';
  policyReference: string;
  description: string;
  impact: string;
  evidence: string;
  remediation: string[];
}

export interface AndroidAuditReport {
  summary: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  issues: AndroidComplianceIssue[];
  recommendations: string[];
  analyzedAt: string;
  appVersion?: string;
  packageName?: string;
}

export const androidReportTemplate = {
  sections: [
    {
      id: 'permissions',
      title: 'Permissions Analysis',
      icon: '🔐',
      items: [
        'Dangerous permissions detected',
        'Permission justification',
        'Over-privileged app',
        'Runtime permission handling',
      ]
    },
    {
      id: 'dataSafety',
      title: 'Data Safety Compliance',
      icon: '📊',
      items: [
        'Data collection disclosure',
        'Data usage transparency',
        'Third-party data sharing',
        'Privacy policy',
      ]
    },
    {
      id: 'ads',
      title: 'Monetization & Ads',
      icon: '💰',
      items: [
        'Ad transparency',
        'In-app purchases',
        'Subscription terms',
        'Billing compliance',
      ]
    },
    {
      id: 'content',
      title: 'Content Policy',
      icon: '📱',
      items: [
        'Restricted content',
        'UGC moderation',
        'Age ratings',
        'Copyright compliance',
      ]
    }
  ],
  severityColors: {
    Critical: 'red',
    High: 'orange',
    Medium: 'yellow',
    Low: 'blue',
  },
  policyReferences: {
    permissions: 'https://developer.android.com/google/play/policies#permissions',
    dataSafety: 'https://support.google.com/googleplay/android-developer/answer/10787216',
    ads: 'https://developer.android.com/google/play/policies#ads',
    monetization: 'https://play.google.com/about/developer-payment-policy/',
    content: 'https://play.google.com/about/developer-content-policy/',
  }
};

export function generateMarkdownReport(report: AndroidAuditReport): string {
  return `# Android Play Store Compliance Report

**Analyzed**: ${report.analyzedAt}
**Risk Level**: ${report.riskLevel}

## Summary

${report.summary}

## Issues Found

${report.issues.map(issue => `
### ${issue.severity} ${issue.title}

**Category**: ${issue.category}
**Policy**: [Reference](${issue.policyReference})

**Description**: ${issue.description}

**Impact**: ${issue.impact}

**Evidence**: ${issue.evidence}

**Remediation**:
${issue.remediation.map(step => `1. ${step}`).join('\n')}
`).join('\n---\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}
`;
}
```

---

## 4. API Endpoint

**File**: `src/app/api/audit-android/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { androidAuditPrompt, androidRemediationPrompt } from '@/lib/android-prompts';
import { AndroidAuditReport } from '@/lib/android-report-template';

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

async function generateRemediation(issue: any, apiKey: string): Promise<string> {
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
          content: `${androidRemediationPrompt}\n\nIssue: ${JSON.stringify(issue, null, 2)}`
        }
      ]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}
```

---

## 5. GitHub Issue Template

**File**: `.github/ISSUE_TEMPLATE/android-compliance-issue.md`

```markdown
---
name: Android Compliance Issue
about: Report a Google Play Store compliance issue
title: '[ANDROID] <Brief description>'
labels: ['android', 'compliance', 'play-store']
---

## Issue Summary
<Clear description of the compliance issue>

## Severity
- [ ] Critical (will cause rejection)
- [ ] High (likely to cause rejection)
- [ ] Medium (may cause rejection)
- [ ] Low (best practice)

## Category
- [ ] Permissions
- [ ] Data Safety
- [ ] Monetization & Ads
- [ ] Content Policy

## Policy Reference
<Link to specific Google Play policy>
Example: https://developer.android.com/google/play/policies#permissions

## Evidence
<Screenshots, code snippets, APK analysis results, or behavior description>

## Impact
<Why this may cause app rejection>

## Remediation Steps
1. <Step 1>
2. <Step 2>
3. <Step 3>

## Code Changes (if applicable)
```kotlin
// Before
// After
```

## Acceptance Criteria
- [ ] Issue resolved
- [ ] Policy compliant
- [ ] Tested on device
- [ ] Verified in Play Console

## References
- [Google Play Policy](https://developer.android.com/google/play/policies)
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787216)
```

---

## ✅ Testing Checklist

- [ ] API endpoint responds correctly
- [ ] Prompts generate accurate analysis
- [ ] Report template renders properly
- [ ] Issue template is usable
- [ ] All TypeScript types are correct
- [ ] Error handling works
- [ ] Documentation is complete

---

**Next**: Implement actual code, test, then submit PR
