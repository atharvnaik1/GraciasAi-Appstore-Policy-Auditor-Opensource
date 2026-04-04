// 修复 PDF 生成功能
// 替换 src/app/page.tsx 中的 handleExportPdf 函数

const handleExportPdf = async () => {
  if (!reportContent) return;
  try {
    // 动态导入 html2pdf.js 库
    const html2pdf = (await import('html2pdf.js')).default;
    const { marked } = await import('marked');

    // 配置 marked for GFM
    marked.setOptions({ gfm: true, breaks: true } as any);

    const bodyHtml = await marked.parse(reportContent);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gracias AI — App Store Compliance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo {
      background: linear-gradient(135deg, #7c3aed, #3b82f6);
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
    }
    .brand-name {
      font-size: 15px;
      font-weight: 800;
      color: #000;
    }
    .brand-sub {
      font-size: 8px;
      color: #777;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .meta {
      text-align: right;
      font-size: 9px;
      color: #777;
    }
    h1 {
      font-size: 18px;
      font-weight: 900;
      color: #0f0f1a;
      margin: 20px 0 10px;
      border-bottom: 1px solid #e5e5f0;
      padding-bottom: 6px;
    }
    h2 {
      font-size: 15px;
      font-weight: 800;
      color: #0f0f1a;
      margin: 22px 0 8px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 14px 0 6px;
    }
    p { margin: 6px 0; color: #333; }
    ul { margin: 6px 0 6px 16px; }
    ol { margin: 6px 0 6px 2px; list-style: none; counter-reset: item; }
    ol li {
      counter-increment: item;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 4px 0;
      padding: 6px 10px;
      border: 1px solid #ede9fe;
      border-radius: 6px;
      background: #faf8ff;
    }
    ol li::before {
      content: counter(item);
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #7c3aed;
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    li { margin: 3px 0; color: #444; }
    li > p { margin: 0; }
    strong { font-weight: 700; color: #0f0f1a; }
    code {
      font-family: "SF Mono", "Fira Code", Consolas, monospace;
      font-size: 10px;
      background: #f3f0ff;
      color: #7c3aed;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e9e5ff;
    }
    pre {
      background: #f8f8f8;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 10px;
      overflow-x: auto;
      margin: 10px 0;
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
      color: #333;
    }
    blockquote {
      border-left: 3px solid #7c3aed;
      background: #faf8ff;
      margin: 10px 0;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      color: #444;
    }
    blockquote p { margin: 2px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 11px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #e5e5f0;
    }
    thead { background: #f3f0ff; }
    th {
      padding: 7px 10px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #555;
      border-bottom: 1px solid #e0ddf8;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f0eeff;
      color: #333;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fdfcff; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-critical { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-high { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
    .badge-medium { background: #fefce8; color: #a16207; border: 1px solid #fde68a; }
    .badge-low { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-pass { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #aaa;
    }
    @media print {
      body { padding: 16px 20px; }
      @page { margin: 12mm 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">G</div>
      <div>
        <div class="brand-name">Gracias AI</div>
        <div class="brand-sub">App Store Compliance Auditor</div>
      </div>
    </div>
    <div class="meta">
      <div>${dateStr}</div>
      <div style="margin-top:2px;">gracias.sh</div>
    </div>
  </div>
  <div id="report-body">${bodyHtml}</div>
  <div class="footer">
    <span>Generated by Gracias AI</span>
    <span>gracias.sh</span>
  </div>
  <script>
    // Severity badge colouring
    document.querySelectorAll('td').forEach(function(td) {
      var text = td.textContent.trim();
      var badges = {
        'CRITICAL': 'badge-critical',
        'HIGH': 'badge-high',
        'MEDIUM': 'badge-medium',
        'LOW': 'badge-low',
        'PASS': 'badge-pass',
      };
      if (badges[text]) {
        td.innerHTML = '<span class="badge ' + badges[text] + '">' + text + '</span>';
      }
    });
  </script>
</body>
</html>`;

    // 使用 html2pdf.js 生成 PDF
    const element = document.createElement('div');
    element.innerHTML = fullHtml;
    
    const opt = {
      margin: 10,
      filename: `gracias-ai-audit-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();

  } catch (err) {
    console.error('PDF export failed:', err);
    setErrorMessage('Failed to export PDF. Please try the Markdown export instead.');
  }
};
