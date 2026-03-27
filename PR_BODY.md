## Summary

This PR adds comprehensive Android Play Store compliance auditing support to the Gracias AI auditor.

## Changes

### Backend (API Route)
- Multi-platform support: Accepts both .ipa (iOS) and .apk (Android) files
- Android file extensions: Added support for .kt, .java, .gradle, .kts, .properties, .pro
- Platform detection: Auto-detects platform from file extension
- Play Store audit prompt: Comprehensive policy checks covering:
  - Permissions and Access (dangerous permissions, runtime requests, background location)
  - Data Safety and Privacy (data collection, GDPR/CCPA, encryption)
  - Content and Ads policies (user-generated content, deceptive ads)
  - Monetization and Payments (Google Play Billing compliance)
  - Deceptive Behavior and Malware detection
  - Technical requirements (target API 31+, app signing, battery optimization)
  - Developer Program Policies (metadata accuracy, content ratings)

### Frontend (UI)
- Dual platform support: Upload accepts .ipa and .apk files
- Platform indicator: Shows iOS/Android badge after file upload
- Updated copy: Hero text and upload instructions reflect both platforms

## Testing
- Build succeeds with npm run build
- TypeScript compilation passes
- Both file types accepted in upload component

## Addresses
- Issue #12: Android Play Store Auditor (bounty: INR 2000)

## Screenshot
After uploading an APK file, the UI shows:
- Green Android badge indicating detected platform
- File name and size
- Analyzes against Play Store policies