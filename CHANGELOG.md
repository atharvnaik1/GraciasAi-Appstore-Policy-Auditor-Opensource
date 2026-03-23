# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-03-24

### Fixed
- **PDF Report Generation** - Fixed PDF export functionality in iOS module
  - Added robust error handling for html2pdf.js dynamic import
  - Added loading state indicator during PDF generation
  - Added error message display for failed exports
  - Improved cleanup of temporary DOM elements
  - Fixed potential memory leaks with proper wrapper removal

### Improved
- **PDF Export Quality** - Enhanced PDF output formatting
  - Added comprehensive styling for all markdown elements
  - Improved heading hierarchy with consistent sizing
  - Added proper table styling with borders and padding
  - Enhanced code block and blockquote formatting
  - Added footer with contact information
  - Improved date display in header
  - Added page break handling

- **Report Structure** - Enhanced compliance audit report structure
  - Added detailed Executive Summary section
  - Expanded Compliance Dashboard with Total Checks metric
  - Reorganized compliance checks into clear subsections
  - Added specific guideline references (e.g., "1.1.1-1.1.4")
  - Added new compliance categories:
    - 1.4 Kids Category (COPPA, age-gating)
    - 2.2 Beta Testing (TestFlight indicators)
    - 3.3 Advertising & Monetization
    - 4.3 System Features (background modes, permissions)
    - 4.4 Extensions & Widgets
    - 5.3 App Tracking Transparency (ATT)
    - 5.5 Special Entitlements (HealthKit, HomeKit, Sign in with Apple)
    - 6.1 Architecture (IPv6, 64-bit)
    - 6.2 API Usage (public APIs, deprecation)
    - 6.3 Entitlements & Capabilities

- **Remediation Plan** - Improved issue tracking and resolution
  - Added Guideline reference column to issue table
  - Added Fix Steps column with step-by-step instructions
  - Added Priority Issues section with severity sorting
  - Added Fix Priority Order section
  - Added Submission Checklist for pre-submission verification
  - Added Estimated Review Risk indicator

### Technical Changes
- Added `isExportingPdf` and `pdfExportError` state variables
- Added `Printer` icon import from lucide-react
- Improved error messages with user-friendly descriptions
- Added proper TypeScript type annotations
- Enhanced html2canvas configuration for better PDF output