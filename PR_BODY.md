# Fine-Tuned Audit Prompts for Industry-Standard Reports

## Overview

This PR optimizes the AI-generated App Store compliance audit reports to feel like they came from a senior App Store reviewer - precise, actionable, and tightly aligned with Apple policies.

Closes #11

## Key Improvements

### Phase 1 - Compliance Enhancements

1. **Structured Policy Checks with Apple Guideline References**
   - Each check now includes exact Apple Guideline section numbers (e.g., "Guideline 3.1.1")
   - Checks are organized by Apple's official category structure (Safety, Performance, Business, Design, Legal & Privacy, Technical)

2. **Evidence-Based Reporting**
   - Every finding must cite actual code evidence (file path:line)
   - Clear pass/fail/warning indicators with specific evidence
   - No more vague advice - everything is tied to actual code patterns

3. **Clean Table-Based Format**
   - Compliance checks presented in structured tables:
     | Check | Status | Evidence | Policy Reference |
   - Easy to scan and understand

### Phase 2 - Actionable Remediation

1. **Prioritized Fix Lists**
   - 🔴 Critical — Must Fix Before Submission
   - 🟠 High Priority — Strongly Recommended
   - 🟡 Medium Priority — Recommended
   - 🟢 Low Priority — Nice to Have

2. **GitHub Issue-Ready Format**
   - Each critical/high issue formatted as copy-pasteable GitHub issue
   - Includes: severity, affected files, evidence, recommended fix, acceptance criteria

3. **Effort Estimates**
   - Each remediation item includes estimated effort (1h, 4h, 1d)

## Technical Changes

### New File: `src/lib/audit-prompts.ts`

Created a dedicated module for audit prompts:

```typescript
export function buildAuditPrompt(
  files: { path: string; content: string }[],
  context: string
): AuditPromptConfig
```

Key features:
- Sanitized context input (max 2000 chars, prevents prompt injection)
- Detailed policy check tables
- GitHub issue templates
- Submission readiness scoring

### Updated: `src/app/api/audit/route.ts`

- Removed inline prompt building
- Now imports from `@/lib/audit-prompts`
- Cleaner code organization

## Example Output Structure

```markdown
# 📋 App Store Compliance Audit Report

## Executive Summary
**Risk Level:** 🟡 Medium
**Submission Readiness Score:** 72/100

## 🔍 Compliance Analysis

### 1. Safety — Guideline 1.0

| Check | Status | Evidence | Policy Reference |
|-------|--------|----------|------------------|
| Objectionable content filters | ✅ PASS | ContentFilter.swift:45 | 1.1 |
| User-generated content moderation | ⚠️ WARNING | No moderation found | 1.2 |

## 🛠️ Remediation Plan

### 🔴 Critical — Must Fix Before Submission

| # | Issue | Files | Fix | Effort |
|---|-------|-------|-----|--------|
| 1 | Missing ATT prompt | AppDelegate.swift:23 | Add ATTrackingManager | 2h |

## 📝 GitHub Issues

### Issue: Missing App Tracking Transparency Permission

**Severity:** 🔴 Critical
**Apple Guideline:** 5.1.1
...
```

## Benefits

1. **For Developers**: Clear, actionable feedback with exact file references
2. **For Reviewers**: Consistent, policy-aligned output
3. **For Teams**: Ready-to-use GitHub issues for task tracking

## Testing

- [ ] Tested with sample .ipa file
- [ ] Verified prompt injection protection
- [ ] Confirmed output format matches specification

---

**Bounty:** ₹600 (~$7)