# Prompt Fine-Tuning & Report Quality Improvement

提示词微调和报告质量改进。

## 版权声明
MIT License | Copyright (c) 2026 思捷娅科技 (SJYKJ)

---

## Overview

本模块微调 AI 提示词，提升最终报告的精确性和格式质量。

## 功能特性

### Phase 1 - iOS 提示词优化

**改进内容：**
- ✅ 微调 iOS 合规检查提示词
- ✅ 提升报告精确性
- ✅ 改善格式和可读性
- ✅ 减少模糊或通用的 AI 输出

### Phase 2 - Android 提示词优化

**改进内容：**
- ✅ 微调 Android Play Store 合规提示词
- ✅ 提升问题检测准确性
- ✅ 改善修复建议质量

### Phase 3 - 通用报告质量

**改进内容：**
- ✅ 统一报告结构
- ✅ 提升行业级质量
- ✅ 减少 AI 痕迹
- ✅ 增加人工审核感

---

## 提示词示例

### iOS 合规检查提示词

```
You are a senior App Store reviewer with 10+ years of experience.
Analyze this app for compliance with Apple App Store Review Guidelines.

For each issue found:
1. Provide specific guideline reference (section number)
2. Explain the exact problem in clear terms
3. Describe the impact on users and review process
4. Provide concrete evidence from the app
5. Suggest precise, actionable fixes

Avoid vague statements like "may cause issues".
Be specific: "Will be rejected under Guideline 5.1.1 because..."

Output format:
## Issue Title

**Severity:** High/Medium/Low

**Guideline Reference:** Section X.X.X

**Problem:** [Clear description]

**Impact:** [Why it matters]

**Evidence:** [Specific findings]

**Fix:** [Step-by-step resolution]
```

### Android 合规检查提示词

```
You are a senior Google Play reviewer with expertise in Android policies.
Analyze this app for compliance with Google Play Developer Policies.

Focus on:
1. Permissions misuse (SMS, Call Logs, Location, etc.)
2. Data Safety & privacy disclosures
3. Ads & monetization violations
4. Restricted content

For each issue:
1. Link to specific policy section
2. Explain the violation clearly
3. Provide code-level evidence
4. Suggest exact fixes with code examples

Output format:
## Issue Title

**Severity:** High/Medium/Low

**Policy Reference:** [Link to policy]

**Violation:** [Clear description]

**Impact:** [Rejection risk]

**Evidence:** [Code/logs]

**Fix:** [Code suggestions]
```

### 报告生成提示词

```
Generate a compliance report that feels like it came from a senior reviewer,
not generic AI output.

Requirements:
- Use professional, precise language
- Avoid vague terms ("may", "might", "could")
- Be definitive ("will", "does", "is")
- Provide specific examples
- Include exact policy references
- Suggest actionable, step-by-step fixes

Tone: Professional, authoritative, helpful
Format: Clear headings, bullet points, code blocks
Length: Comprehensive but concise
```

---

## 质量改进

### Before (Generic AI)

```
The app may have permission issues.
Consider reviewing the permissions.
This might cause rejection.
```

### After (Senior Reviewer)

```
**Issue:** Dangerous Permission: READ_SMS without justification

**Guideline:** App Store Review Guideline 5.1.1 - Data Collection and Storage

**Problem:** App requests READ_SMS permission but does not use SMS functionality
in the core app experience. No justification provided in App Store Connect.

**Impact:** Will be rejected during App Store review. Apps must justify all
dangerous permissions with clear use cases.

**Evidence:** AndroidManifest.xml line 45:
<uses-permission android:name="android.permission.READ_SMS" />

**Fix:**
1. If SMS is not essential, remove the permission
2. If essential, add clear justification in App Store Connect
3. Update privacy policy to disclose SMS data usage
```

---

## 测试与验证

### 测试方法

1. **A/B 测试** - 对比新旧提示词输出
2. **人工审核** - 资深审核员评估报告质量
3. **自动评分** - 使用 NLP 模型评估报告精确性

### 质量指标

- ✅ 精确性得分（0-100）
- ✅ 可读性得分（0-100）
- ✅ 可操作性得分（0-100）
- ✅ AI 痕迹得分（越低越好）

---

## 安装

```bash
npm install
```

---

## 使用示例

```javascript
const PromptTuner = require('./prompt-tuner');

const tuner = new PromptTuner();

// 加载提示词
await tuner.loadPrompts('ios-compliance');

// 微调提示词
await tuner.fineTune({
  target: 'precision',
  iterations: 100
});

// 生成报告
const report = await tuner.generateReport(appData);
```

---

## 许可证

MIT License

---

*Prompt Fine-Tuning by 小米辣 (PM + Dev) 🌶️*
