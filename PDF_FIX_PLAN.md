# PDF Report Fix - Issue #14

## Problem Analysis

The current PDF export uses HTML print window, which:
1. Opens a popup window (often blocked)
2. Relies on browser's print-to-PDF
3. Doesn't use the installed `html2pdf.js` library
4. Inconsistent formatting across browsers

## Solution

Use `html2pdf.js` for proper PDF generation.

### Implementation

```typescript
import html2pdf from 'html2pdf.js';

const exportToPdf = async (reportData: any) => {
  try {
    const element = document.getElementById('report-content');
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `gracias-ai-audit-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('PDF export failed:', err);
    setErrorMessage('Failed to export report. Please try again.');
  }
};
```

## Benefits

1. ✅ No popup windows
2. ✅ Consistent formatting
3. ✅ Proper PDF output
4. ✅ Better print quality
5. ✅ Works across all browsers

## Testing

- [ ] Test with sample report
- [ ] Verify formatting
- [ ] Check file size
- [ ] Test on different browsers

## Files to Modify

- `src/app/page.tsx` - Update exportToPdf function
- Add html2pdf import at top of file

---

**Related Issue**: #14 - PDF REPORT IMPROVEMENTS
