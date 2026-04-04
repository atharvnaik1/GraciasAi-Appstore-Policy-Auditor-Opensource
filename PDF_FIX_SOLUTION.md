# PDF Report Generation Fix

## Problem
The current `handleExportPdf` function in `src/app/page.tsx` doesn't use the `html2pdf.js` library. Instead, it opens a print dialog, which doesn't provide a seamless PDF export experience.

## Solution
Replace the `handleExportPdf` function (lines 365-536 in `src/app/page.tsx`) with the corrected version that properly integrates `html2pdf.js`:

```typescript
const handleExportPdf = async () => {
  if (!reportContent) return;
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const { marked } = await import('marked');
    
    marked.setOptions({ gfm: true, breaks: true });
    const bodyHtml = await marked.parse(reportContent);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const fullHtml = `<!DOCTYPE html>...` // Full HTML template here
    
    const element = document.createElement('div');
    element.innerHTML = fullHtml;
    
    await html2pdf().set({
      margin: 10,
      filename: 'gracias-ai-audit-report-' + new Date().toISOString().slice(0, 10) + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  } catch (err) {
    console.error('PDF export failed:', err);
    setErrorMessage('Failed to export PDF. Please try Markdown export instead.');
  }
};
```

## Benefits
- ✅ Direct PDF generation without print dialog
- ✅ Better user experience
- ✅ Proper formatting and styling
- ✅ Severity badges with color coding

## Testing
1. Run `npm run dev`
2. Upload an IPA file
3. Generate audit report
4. Click "PDF" button
5. Verify PDF downloads automatically

## Files Changed
- `src/app/page.tsx` - Modified `handleExportPdf` function

Bounty: ₹2000
