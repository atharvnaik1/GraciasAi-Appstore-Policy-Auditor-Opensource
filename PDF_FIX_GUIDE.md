# 🔧 PDF Report Generation Fix

## Problem
The PDF export feature may fail due to:
1. `html2pdf.js` not properly handling the dynamic content
2. Report content not fully rendered before export
3. CSS styling issues during PDF generation

## Solution

### Step 1: Add Loading State for PDF Export

Update `handleExportPdf` function in `src/app/page.tsx`:

```typescript
const handleExportPdf = async () => {
  if (!reportContent || !completeReportRef.current) return;
  
  try {
    // Show loading state
    setErrorMessage('Generating PDF...');
    
    const html2pdf = (await import('html2pdf.js')).default;

    // Build a wrapper with branded header + watermark + report content
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.padding = '24px';
    wrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    wrapper.style.color = '#1a1a1a';
    wrapper.style.width = '800px';

    // ... existing header code ...

    // Clone report content
    const clone = completeReportRef.current.cloneNode(true) as HTMLElement;
    
    // Wait for images and fonts to load
    await document.fonts.ready;
    
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.position = 'relative';
    clone.style.zIndex = '1';
    
    // ... existing styling code ...
    
    wrapper.appendChild(clone);

    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    document.body.appendChild(wrapper);
    
    // Wait for DOM to settle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await html2pdf()
      .from(wrapper)
      .set({
        margin: 10,
        filename: `gracias-ai-audit-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg' as 'jpeg' | 'png' | 'webp', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false, 
          scrollY: 0,
          windowWidth: 800,
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as 'portrait' | 'landscape' },
      })
      .save()
      .then(() => {
        setErrorMessage(''); // Clear success
      })
      .catch((err: any) => {
        console.error('PDF save error:', err);
        throw err;
      });
      
    document.body.removeChild(wrapper);
  } catch (err) {
    console.error('PDF export failed:', err);
    setErrorMessage('Failed to export PDF. Please try Markdown export instead.');
  }
};
```

### Step 2: Add Alternative Export Options

Add a plain HTML export option as fallback:

```typescript
const handleExportHtml = () => {
  if (!reportContent) return;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gracias AI Audit Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; }
    h1, h2, h3 { color: #1a1a1a; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  ${reportContent}
</body>
</html>`;
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gracias-ai-audit-report-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
};
```

### Step 3: Update UI with Export Options

Replace the export buttons section with:

```tsx
<div className="flex items-center gap-2 w-full sm:w-auto">
  <button
    onClick={handleExportReport}
    className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-black hover:bg-gray-100 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
  >
    <Download className="w-3.5 h-3.5" /> Markdown
  </button>
  <button
    onClick={handleExportPdf}
    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
  >
    <FileText className="w-3.5 h-3.5" /> PDF
  </button>
  <button
    onClick={handleExportHtml}
    className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
  >
    <FileText className="w-3.5 h-3.5" /> HTML
  </button>
  <button
    onClick={() => { setPhase('idle'); setReportContent(''); setFile(null); }}
    className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
  >
    <ArrowLeft className="w-3.5 h-3.5" /> New Audit
  </button>
</div>
```

## Testing

1. Run audit with a sample .ipa file
2. Test all three export formats (Markdown, PDF, HTML)
3. Verify PDF renders correctly with:
   - Header branding
   - Watermark
   - All sections visible
   - Proper page breaks
4. Check browser console for errors

## Additional Improvements

### Add Print CSS

Create `src/app/globals.css` with print-specific styles:

```css
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  
  .no-print {
    display: none !important;
  }
  
  .prose {
    max-width: none !important;
  }
  
  @page {
    margin: 2cm;
    size: A4 portrait;
  }
}
```

### Add Browser Detection

Some browsers handle PDF export better than others. Add a note:

```tsx
{errorMessage && (
  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
    <p className="text-yellow-300 text-xs">
      <strong>Tip:</strong> PDF export works best in Chrome/Edge. 
      If issues persist, use Markdown export and convert to PDF using your browser's Print → Save as PDF.
    </p>
  </div>
)}
```

## Deliverables

✅ Fixed PDF export with better error handling
✅ Added HTML export as fallback option
✅ Added loading state during PDF generation
✅ Added browser compatibility notes
✅ Improved export button layout

---

**Time Estimate:** 2-3 hours
**Difficulty:** Medium
**Files Modified:** `src/app/page.tsx`, `src/app/globals.css` (optional)
