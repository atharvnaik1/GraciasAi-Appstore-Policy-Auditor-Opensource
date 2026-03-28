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
