export interface ComplianceFinding {
  guideline: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  finding: string;
  evidence: string;
  appleGuideline: string;
  riskExplanation: string;
  fix: string[];
  testingSteps: string[];
}

export interface EnhancedAuditReport {
  executiveSummary: string;
  rejectionRisk: 'High' | 'Medium' | 'Low';
  criticalIssues: ComplianceFinding[];
  warnings: ComplianceFinding[];
  recommendations: ComplianceFinding[];
  policyReferences: string[];
  analyzedAt: string;
}

export const executiveSummaryTemplate = (report: EnhancedAuditReport) => `
## Executive Summary

**Rejection Risk**: ${report.rejectionRisk}

${report.executiveSummary}

### Quick Stats
- Critical Issues: ${report.criticalIssues.length}
- Warnings: ${report.warnings.length}
- Recommendations: ${report.recommendations.length}

### Priority Actions
${report.criticalIssues.slice(0, 3).map((issue, i) => 
`${i + 1}. **${issue.title}** - Fix immediately (${issue.guideline})`
).join('\n')}
`;

export const detailedFindingTemplate = (issue: ComplianceFinding) => `
### ${issue.severity} ${issue.title}

**Guideline**: [${issue.guideline}](${issue.appleGuideline})

#### Finding
${issue.finding}

#### Evidence
${issue.evidence}

#### Apple's Guideline
> "${issue.appleGuideline}"

#### Why This Causes Rejection
${issue.riskExplanation}

#### How to Fix
${issue.fix.map((step, i) => `${i + 1}. ${step}`).join('\n')}

#### Testing
${issue.testingSteps.map(step => `- ${step}`).join('\n')}
`;

export const remediationTemplate = (issue: ComplianceFinding) => `
## Remediation Plan: ${issue.title}

### Root Cause Analysis
- **Violation**: ${issue.guideline}
- **Apple's Concern**: ${issue.riskExplanation}
- **Common Mistake**: Using external payment links for digital goods

### Code Changes

#### Before
\`\`\`swift
// Example problematic code
StoreKit.shared.presentExternalPayment()
\`\`\`

#### After
\`\`\`swift
// Fixed code - use In-App Purchase
import StoreKit
SKPaymentQueue.default().add(payment)
\`\`\`

### App Store Connect Configuration
1. Update Privacy Nutrition Labels
2. Add In-App Purchase products
3. Update metadata to reflect IAP

### Testing Instructions
1. Build and run app
2. Trigger purchase flow
3. Verify Apple payment sheet appears
4. Complete test transaction
5. Verify content unlocks

### Prevention
- [ ] Add code review checklist item for payments
- [ ] Add unit test for payment flow
- [ ] Document IAP requirements in onboarding

### GitHub Issue

\`\`\`markdown
### [REJECTION FIX] External Payment Link

**Guideline**: 3.1.1

**Problem**
App uses external payment link for digital goods.

**Solution**
Replace with StoreKit In-App Purchase.

**Acceptance Criteria**
- [ ] External link removed
- [ ] StoreKit implemented
- [ ] Test transaction successful
- [ ] Verified in App Store Connect
\`\`\`
`;

export function generateFullReport(report: EnhancedAuditReport): string {
  return `
# App Store Compliance Report

**Analyzed**: ${report.analyzedAt}
**Rejection Risk**: ${report.rejectionRisk}

${executiveSummaryTemplate(report)}

---

## Critical Issues

${report.criticalIssues.map(issue => detailedFindingTemplate(issue)).join('\n---\n')}

---

## Warnings

${report.warnings.map(issue => detailedFindingTemplate(issue)).join('\n---\n')}

---

## Recommendations

${report.recommendations.map(issue => detailedFindingTemplate(issue)).join('\n---\n')}

---

## Policy References

${report.policyReferences.map(ref => `- ${ref}`).join('\n')}
`;
}
