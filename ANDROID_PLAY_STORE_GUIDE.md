# 🤖 Android Play Store Compliance Guide

## Overview

This guide extends the Gracias AI compliance auditor to support **Google Play Store** policy reviews, complementing the existing Apple App Store auditor.

## Google Play Policy Areas

### 1. Permissions & Data Safety

#### Critical Permissions
```markdown
| Permission | Risk Level | Common Rejection Reasons |
|------------|------------|-------------------------|
| SMS | HIGH | Unauthorized access, premium SMS fraud |
| Call Logs | HIGH | Privacy violation without clear purpose |
| Location | HIGH | Background location without justification |
| Contacts | MEDIUM | Data collection beyond app functionality |
| Camera/Mic | MEDIUM | No runtime permission explanation |
| Storage | MEDIUM | Over-broad file access |
```

#### Data Safety Form Requirements
- ✅ All data types declared accurately
- ✅ Data usage purpose clearly stated
- ✅ Third-party SDKs disclosed
- ✅ Encryption in transit confirmed
- ✅ Data deletion option available

### 2. Ads & Monetization

#### Policy Violations to Check
```markdown
1. **Unexpected Ads**
   - Ads appearing without user interaction
   - Interstitial ads during critical user flows

2. **Deceptive Ad Implementation**
   - Ads disguised as app content
   - Fake close buttons
   - Accidental click triggers

3. **In-App Purchase Conflicts**
   - Physical goods using Google Play Billing
   - External payment links for digital content
   - Misleading subscription terms

4. **Rewarded Ads**
   - Reward not delivered as promised
   - No clear ad duration disclosure
```

### 3. User-Generated Content (UGC)

#### Required Safeguards
```markdown
- [ ] Content moderation system in place
- [ ] Report/flag mechanism for users
- [ ] Clear community guidelines published
- [ ] Age-gating for mature content
- [ ] DMCA/copyright takedown process
```

### 4. Restricted Content

#### Prohibited Categories
```markdown
1. **Illegal Activities**
   - Gambling without license
   - Regulated goods (drugs, weapons)
   - Counterfeit products

2. **Harmful Content**
   - Hate speech
   - Harassment/bullying
   - Self-harm promotion

3. **Sexual Content**
   - Pornography
   - Dating apps without proper age verification
   - Sexually explicit games

4. **Violence**
   - Graphic violence without context
   - Promotion of violent extremism
```

## Compliance Report Template

```markdown
# Google Play Store Compliance Audit Report

## Executive Summary

[Brief 2-3 sentence summary of app functionality and overall compliance status]

## Dashboard

| Metric | Value |
|--------|-------|
| Overall Risk Level | 🟢 LOW / 🟡 MEDIUM / 🔴 HIGH |
| Submission Recommendation | YES / NO / WITH CAVEATS |
| Readiness Score | X/100 |
| Critical Issues | [count] |
| Warnings | [count] |
| Passed Checks | [count] |

---

## Phase 1: Policy Compliance Checks

### 1. Data Safety & Privacy

> **[STATUS: PASS/WARN/FAIL]** Data Safety Form Accuracy
>
> **Policy:** [Play Console → Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
>
> **Finding:** [Specific observation from code analysis]
>
> **File(s):** `AndroidManifest.xml:line`
>
> **Action:** [Required fix or confirmation]

#### Checks:
- [ ] All permissions declared in manifest match Data Safety form
- [ ] Data collection purposes accurately described
- [ ] Third-party SDKs disclosed
- [ ] Data deletion mechanism implemented
- [ ] Privacy policy URL accessible

### 2. Permissions Usage

#### High-Risk Permissions Review

> **[STATUS: PASS/WARN/FAIL]** SMS Permission Justification
>
> **Policy:** [Permissions policy](https://play.google.com/about/permissions/)
>
> **Finding:** App requests SEND_SMS permission
>
> **File(s):** `AndroidManifest.xml:45`
>
> **Action:** Remove permission or provide core functionality justification

#### Permission Checklist:
- [ ] SMS (SEND/RECEIVE) - Core functionality only
- [ ] Call Logs (READ_CALL_LOG) - Not allowed for most apps
- [ ] Location (ACCESS_FINE/BACKGROUND) - Justified use case
- [ ] Contacts - User-initiated action required
- [ ] Camera/Microphone - Runtime permission with explanation

### 3. Ads & Monetization

> **[STATUS: PASS/WARN/FAIL]** Ad Implementation Compliance
>
> **Policy:** [AdMob policy](https://support.google.com/admob/answer/6128543)
>
> **Finding:** Interstitial ads shown during checkout flow
>
> **File(s):** `CheckoutActivity.java:127`
>
> **Action:** Move ads outside critical user flows

#### Monetization Checks:
- [ ] No deceptive ad placement
- [ ] Clear distinction between ads and content
- [ ] Functional close buttons on interstitials
- [ ] Digital goods use Google Play Billing
- [ ] Subscription terms clearly disclosed

### 4. User-Generated Content

> **[STATUS: PASS/WARN/FAIL]** Content Moderation System
>
> **Policy:** [User-generated content policy](https://play.google.com/about/developer-content-policy/)
>
> **Finding:** No report/flag mechanism found for user posts
>
> **File(s):** `PostFragment.kt:89-156`
>
> **Action:** Implement content reporting feature

#### UGC Requirements:
- [ ] Content moderation system
- [ ] User reporting mechanism
- [ ] Community guidelines published
- [ ] Age-gating for mature content
- [ ] Copyright takedown process

### 5. Restricted Content

> **[STATUS: PASS/WARN/FAIL]** No Prohibited Content
>
> **Policy:** [Prohibited content policy](https://play.google.com/about/prohibited-content/)
>
> **Finding:** [Specific finding or "No issues found"]
>
> **File(s):** [Relevant files]
>
> **Action:** [Required action]

---

## Phase 2: Remediation Plan

| # | Issue | Severity | File(s) | Fix Description | Effort |
|---|-------|----------|---------|-----------------|--------|
| 1 | [Issue name] | CRITICAL | `file.kt:line` | [What to fix] | [Low/Med/High] |
| 2 | [Issue name] | HIGH | `file.kt:line` | [What to fix] | [Low/Med/High] |

### Severity Definitions:
- **CRITICAL** — Will almost certainly cause rejection
- **HIGH** — Frequently causes rejection
- **MEDIUM** — May cause rejection depending on reviewer
- **LOW** — Best practice improvement

---

## Submission Readiness

**Score: X/100**

**Verdict: READY / NOT READY / READY WITH CAVEATS**

[2-3 sentence summary of submission readiness and priority next steps]

---

## GitHub Issue Templates

### Issue: SMS Permission Without Justification

```markdown
## 🚨 CRITICAL: SMS Permission Violation

### Policy Reference
[Google Play Permissions Policy](https://play.google.com/about/permissions/)

### Problem
App requests `SEND_SMS` permission without core functionality justification.

### Detection
- File: `AndroidManifest.xml:45`
- Permission: `<uses-permission android:name="android.permission.SEND_SMS" />`

### Impact
App will be rejected during review. SMS permissions are highly restricted.

### Fix Steps
1. Determine if SMS functionality is core to app purpose
2. If YES: Prepare justification for Play Console
3. If NO: Remove permission from manifest
4. Test app functionality without SMS access

### Acceptance Criteria
- [ ] SMS permission removed OR justification submitted
- [ ] App functions correctly without SMS (if removed)
- [ ] Play Console declaration updated if applicable
```

### Issue: Missing Data Deletion Option

```markdown
## ⚠️ HIGH: Data Deletion Not Available

### Policy Reference
[Data Safety Requirements](https://support.google.com/googleplay/android-developer/answer/10787469)

### Problem
App collects user data but provides no deletion mechanism.

### Detection
- User data stored in Room database
- No "Delete Account" or "Clear Data" option in settings

### Impact
May cause rejection under Data Safety policy.

### Fix Steps
1. Add "Delete Account" option in Settings screen
2. Implement data deletion logic:
   - Clear all local database records
   - Delete user account from backend (if applicable)
   - Remove cached files
3. Confirm deletion completes within 30 days

### Acceptance Criteria
- [ ] "Delete Account" button visible in Settings
- [ ] All user data deleted on confirmation
- [ ] Confirmation message shown to user
- [ ] Backend deletion request sent (if applicable)
```

---

## Testing Checklist

Before submission, verify:

### Pre-Submission Tests
- [ ] Install from Play Store internal testing track
- [ ] Run through all app flows
- [ ] Verify all permissions have runtime explanations
- [ ] Test data deletion flow end-to-end
- [ ] Check ad placement doesn't interfere with UX
- [ ] Verify all links (privacy policy, terms) work

### Device Compatibility
- [ ] Test on Android 8.0 (API 26) minimum
- [ ] Test on latest Android version
- [ ] Test on tablet (if supported)
- [ ] Test foldable device compatibility (if applicable)

---

## Common Rejection Reasons

### Top 10 Play Store Rejections:

1. **Unexpected functionality** - App doesn't match description
2. **Intrusive ads** - Ads interfere with app usage
3. **Data Safety form inaccuracies** - Declared data doesn't match actual collection
4. **Missing privacy policy** - No accessible privacy policy
5. **Permission overreach** - Requesting unnecessary permissions
6. **User data security** - Insecure data transmission/storage
7. **Intellectual property** - Copyright/trademark violations
8. **Impersonation** - Misleading users about app origin
9. **Spam** - Repetitive or low-effort app submissions
10. **Restricted content** - Prohibited content categories

---

## Resources

### Official Documentation
- [Google Play Developer Policies](https://play.google.com/about/developer-content-policy/)
- [Data Safety Section](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Permissions Policy](https://play.google.com/about/permissions/)
- [Monetization Policy](https://support.google.com/googleplay/android-developer/answer/9873284)

### Tools
- [Play Console](https://play.google.com/console)
- [Android Debug Bridge (ADB)](https://developer.android.com/tools/adb)
- [Play Integrity API](https://developer.android.com/google/play/integrity)

---

**Contact**: business@gracias.sh for expedited development and deployment support.
