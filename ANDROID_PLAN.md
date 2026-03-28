# Android Play Store Auditor - Implementation Plan

**Issue**: #12 - Android Play Store Auditor  
**Bounty**: ₹2000 (~$24)  
**Timeline**: 2-3 days

---

## 📋 Scope Analysis

### Phase 1: Play Store Compliance Engine

**Key Areas**:
1. ✅ Permissions misuse (SMS, Call Logs, Location)
2. ✅ Data Safety & privacy disclosures
3. ✅ Ads & monetization violations
4. ✅ Restricted content & UGC rules

### Phase 2: Remediation + Developer Actions

**Deliverables**:
1. ✅ Code-level fix suggestions
2. ✅ Play Console config fixes
3. ✅ Policy-compliant alternatives
4. ✅ GitHub issue templates

---

## 🏗️ Implementation Plan

### Step 1: Research Play Store Policies

- [ ] Google Play Developer Policy Center
- [ ] Common rejection reasons
- [ ] Permission usage guidelines
- [ ] Data Safety section requirements

### Step 2: Create Android Audit Prompts

```typescript
const androidAuditPrompt = `
You are an expert Android app reviewer specializing in Google Play Store compliance.

Analyze the uploaded Android app package for:

1. **Permissions Analysis**
   - Check for dangerous permissions (SMS, CALL_LOGS, CONTACTS, etc.)
   - Verify permission justification
   - Flag unnecessary high-risk permissions

2. **Data Safety Compliance**
   - Data collection disclosure
   - Data usage transparency
   - Third-party SDK data sharing

3. **Monetization & Ads**
   - Deceptive ads detection
   - In-app purchase clarity
   - Subscription terms visibility

4. **Content Policy**
   - Restricted content detection
   - User-generated content moderation
   - Age-appropriate content

Generate a structured compliance report with:
- Issue title
- Severity (Critical/High/Medium/Low)
- Policy reference (link to specific guideline)
- Description
- Impact (rejection risk)
- Evidence
- Remediation steps
`;
```

### Step 3: Implement Android Module

**File**: `src/app/api/audit-android/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { apkData, claudeApiKey } = await req.json();
  
  // Analyze Android app
  const analysis = await analyzeAndroidApp(apkData, claudeApiKey);
  
  return NextResponse.json({ report: analysis });
}

async function analyzeAndroidApp(apkData: any, apiKey: string) {
  // Use Claude to analyze Android-specific concerns
  // - Permissions from AndroidManifest.xml
  // - Data Safety disclosures
  // - Ad network implementations
  // - Content policy violations
}
```

### Step 4: Create Report Templates

**File**: `src/lib/android-report-template.ts`

```typescript
export const androidReportTemplate = {
  sections: [
    {
      title: 'Permissions Analysis',
      items: ['Dangerous permissions', 'Permission justification', 'Over-privileged app']
    },
    {
      title: 'Data Safety Compliance',
      items: ['Data collection', 'Data sharing', 'Privacy policy']
    },
    {
      title: 'Monetization & Ads',
      items: ['Ad transparency', 'In-app purchases', 'Subscriptions']
    },
    {
      title: 'Content Policy',
      items: ['Restricted content', 'UGC moderation', 'Age ratings']
    }
  ],
  severityLevels: ['Critical', 'High', 'Medium', 'Low'],
  policyReferences: {
    permissions: 'https://developer.android.com/google/play/policies#permissions',
    dataSafety: 'https://support.google.com/googleplay/android-developer/answer/10787216',
    ads: 'https://developer.android.com/google/play/policies#ads',
  }
};
```

### Step 5: GitHub Issue Templates

**File**: `.github/ISSUE_TEMPLATE/android-compliance-issue.md`

```markdown
---
name: Android Compliance Issue
about: Report a Play Store compliance issue
title: '[COMPLIANCE] <Brief description>'
labels: ['android', 'compliance', 'play-store']
---

## Issue Summary
<Clear description of the compliance issue>

## Severity
- [ ] Critical (will cause rejection)
- [ ] High (likely to cause rejection)
- [ ] Medium (may cause rejection)
- [ ] Low (best practice)

## Policy Reference
<Link to specific Google Play policy>

## Evidence
<Screenshots, code snippets, or behavior description>

## Impact
<Why this may cause app rejection>

## Remediation Steps
1. <Step 1>
2. <Step 2>
3. <Step 3>

## Acceptance Criteria
- [ ] Issue resolved
- [ ] Policy compliant
- [ ] Tested and verified
```

---

## ✅ Expected Deliverables

1. **Android Audit API** - New endpoint for Android analysis
2. **Compliance Prompts** - Specialized prompts for Play Store policies
3. **Report Template** - Android-specific report structure
4. **GitHub Templates** - Issue templates for devs
5. **Documentation** - How to use the Android auditor

---

## 📊 Timeline

| Day | Tasks |
|-----|-------|
| Day 1 | Research + Prompts |
| Day 2 | Implementation + Testing |
| Day 3 | Documentation + PR |

---

## 🎯 Success Criteria

- [ ] Android apps can be analyzed
- [ ] Reports align with Play Store policies
- [ ] Remediation steps are actionable
- [ ] GitHub issues are dev-ready

---

**Related Issues**: #11 (Prompt optimization), #14 (PDF improvements)
