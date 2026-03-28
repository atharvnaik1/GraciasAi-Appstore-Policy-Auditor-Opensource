# Prompt Optimization - Implementation Plan

**Issue**: #11 - Fine tune prompts and make reports precise  
**Bounty**: ₹800 (~$10)  
**Timeline**: 1 day

---

## 📋 Problem Analysis

### Current Issues
1. ❌ Vague AI output
2. ❌ Not aligned with Apple policies
3. ❌ Reports lack structure
4. ❌ Remediation not actionable

### Goals
1. ✅ Tight alignment with Apple App Store Guidelines
2. ✅ Clean, structured, no-fluff reports
3. ✅ Actionable remediation steps
4. ✅ Professional tone (senior reviewer quality)

---

## 🎯 Solution

### Phase 1: Compliance Prompts

**Enhance existing prompts with**:
1. Specific Apple policy references
2. Structured output format
3. Severity-based prioritization
4. Evidence requirements

### Phase 2: Remediation Prompts

**Add**:
1. Code-level fix suggestions
2. App Store Connect configuration steps
3. Testing instructions
4. Acceptance criteria

---

## 📝 Implementation

### File 1: `src/lib/ios-audit-prompts.ts` (Enhanced)

```typescript
export const iosAuditPromptV2 = `You are a senior App Store reviewer with 10+ years of experience.

Analyze this iOS app for App Store compliance.

## Review Guidelines

Reference: https://developer.apple.com/app-store/review-guidelines/

### Critical Areas
1. **Safety** (4.1, 4.2, 4.3)
   - Objectionable content
   - User-generated content moderation
   - Harassment or discrimination

2. **Performance** (2.1, 2.3, 2.5)
   - App completeness
   - Accurate metadata
   - Software requirements

3. **Business** (3.1, 3.2, 3.3)
   - Payments (in-app purchase requirements)
   - Pricing models
   - Subscription clarity

4. **Design** (4.1, 4.2, 4.3)
   - Spam (copycat apps)
   - Minimum functionality
   - User interface quality

5. **Legal** (5.1, 5.2, 5.3)
   - Privacy policy
   - Data collection
   - Terms of service

## Output Requirements

Generate a JSON report:

{
  "executiveSummary": "2-3 sentence overview",
  "rejectionRisk": "High|Medium|Low",
  "criticalIssues": [],
  "warnings": [],
  "recommendations": [],
  "policyReferences": []
}

### For Each Issue

{
  "guideline": "4.3 Spam",
  "title": "Specific issue title",
  "severity": "Critical|High|Medium|Low",
  "finding": "What you found (be specific)",
  "evidence": "Screenshots, code, or behavior",
  "appleGuideline": "Exact guideline text",
  "riskExplanation": "Why this causes rejection",
  "fix": ["Step 1", "Step 2", "Step 3"],
  "testingSteps": ["How to verify fix"]
}

## Tone & Style

- Professional, like an Apple reviewer
- Specific, not vague
- Actionable, not theoretical
- Evidence-based, not assumptions
- Concise, no fluff

## Examples

❌ BAD: "Your app might have issues with payments"
✅ GOOD: "Section 3.1.1 violation: Digital goods use external payment link instead of In-App Purchase"

❌ BAD: "Consider improving privacy"
✅ GOOD: "Section 5.1.1 violation: App collects email without explicit consent dialog"

Be precise. Reference exact guidelines. Provide code snippets where applicable.`;
```

### File 2: `src/lib/remediation-prompts.ts`

```typescript
export const remediationPromptV2 = `You are a senior iOS engineer helping fix App Store rejection issues.

For each issue, provide:

## 1. Root Cause Analysis
- Why this violates the guideline
- What Apple's concern is
- Common mistakes that lead to this

## 2. Code Changes

### Before
\`\`\`swift
// Problematic code
\`\`\`

### After
\`\`\`swift
// Fixed code
\`\`\`

## 3. App Store Connect Configuration
- Screenshots of correct settings
- Required metadata updates
- Privacy nutrition labels

## 4. Testing Instructions
1. How to reproduce the issue
2. How to verify the fix
3. What to submit in Resolution Center

## 5. Prevention
- Best practices to avoid this in future
- Code review checklist items
- Automated tests to add

## 6. GitHub Issue Template

\`\`\`markdown
### [REJECTION FIX] <Title>

**Guideline**: X.X.X

**Problem**
<Description>

**Solution**
<Steps>

**Acceptance Criteria**
- [ ] Fixed
- [ ] Tested
- [ ] Verified in App Store Connect
\`\`\`

Format as clean Markdown with clear sections.`;
```

### File 3: `src/lib/report-templates.ts` (Enhanced)

```typescript
export const executiveSummaryTemplate = (report: any) => `
## Executive Summary

**Rejection Risk**: ${report.rejectionRisk}

${report.executiveSummary}

### Quick Stats
- Critical Issues: ${report.criticalIssues.length}
- Warnings: ${report.warnings.length}
- Recommendations: ${report.recommendations.length}

### Priority Actions
${report.criticalIssues.slice(0, 3).map(issue => 
`1. **${issue.title}** - Fix immediately (${issue.guideline})`
).join('\n')}
`;

export const detailedFindingTemplate = (issue: any) => `
### ${issue.severity} ${issue.title}

**Guideline**: [${issue.guideline}](${issue.appleGuidelineUrl})

#### Finding
${issue.finding}

#### Evidence
${issue.evidence}

#### Apple's Guideline
> "${issue.appleGuidelineText}"

#### Why This Causes Rejection
${issue.riskExplanation}

#### How to Fix
${issue.fix.map(step => `1. ${step}`).join('\n')}

#### Testing
${issue.testingSteps.map(step => `- ${step}`).join('\n')}
`;
```

---

## ✅ Deliverables

| File | Description | Status |
|------|-------------|--------|
| `src/lib/ios-audit-prompts.ts` | Enhanced iOS prompts | ⏳ TODO |
| `src/lib/remediation-prompts.ts` | Remediation prompts | ⏳ TODO |
| `src/lib/report-templates.ts` | Report templates | ⏳ TODO |
| `src/lib/prompt-comparison.md` | Before/After comparison | ⏳ TODO |
| `PROMPT_TEST_REPORT.md` | Test results | ⏳ TODO |

---

## 📊 Testing Plan

### Test Cases

1. **Prompt Clarity**
   - Input: Sample app data
   - Expected: Specific, actionable output
   - Compare: Before vs After

2. **Policy Alignment**
   - Check: References correct guidelines
   - Verify: Accurate interpretation

3. **Report Quality**
   - Readability score
   - Actionability score
   - Professional tone

4. **Developer Feedback**
   - Can devs understand the issue?
   - Are fix steps clear?
   - Time to implement

---

## 🎯 Success Criteria

- [ ] Reports are 50% shorter (no fluff)
- [ ] 100% policy reference accuracy
- [ ] All issues have code-level fixes
- [ ] Testing steps included
- [ ] Professional tone throughout

---

**Timeline**: Complete in 4-6 hours
