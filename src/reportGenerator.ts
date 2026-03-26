
import { AuditReport } from './auditLogic';
import { createTemplateEngine } from './templateEngine';

const templateEngine = createTemplateEngine();

interface ReportOptions {
  auditReport: AuditReport;
}

class ReportGenerator {
  generateReport(options: ReportOptions): string {
    const { auditReport } = options;
    const template = templateEngine.getTemplate('report');
    const data = {
      title: 'Audit Report',
      introduction: 'This is an introduction to the audit report.',
      findings: auditReport.findings,
      conclusions: auditReport.conclusions,
      recommendations: auditReport.recommendations,
    };
    return templateEngine.render(template, data);
  }
}

export { ReportGenerator };
