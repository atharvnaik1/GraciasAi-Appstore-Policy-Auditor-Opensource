# Android Play Store Auditor Module

Android 模块扩展，用于 Play Store 合规审计。

## 版权声明
MIT License | Copyright (c) 2026 思捷娅科技 (SJYKJ)

---

## Overview

本模块扩展 https://opensource.gracias.sh/ 以支持 Android Play Store 合规审计。

## 功能特性

### Phase 1 - Play Store 合规引擎

**合规检查领域：**
- ✅ 权限滥用检测（SMS、通话记录、位置等）
- ✅ 数据安全与隐私披露
- ✅ 广告和变现政策违规
- ✅ 受限内容和用户生成内容规则

**输出质量：**
- ✅ 精确的问题检测
- ✅ 结构化、可读的报告
- ✅ 无模糊或通用的 AI 输出

### Phase 2 - 修复建议 + 开发者操作

**修复建议：**
- ✅ 代码级更改建议（如适用）
- ✅ Play Console 配置修复
- ✅ 合规替代方案

**GitHub Issue 生成：**
- ✅ 清晰的标题（明确 + 范围限定）
- ✅ 描述（问题 + 政策参考）
- ✅ 修复步骤
- ✅ 验收标准

---

## 预期输出格式

### ✅ 合规报告

```markdown
## Issue Title

**Severity:** High / Medium / Low

**Policy Reference:** [Play Store guideline link/section]

**Description:** 
什么出了问题

**Impact:** 
为什么可能导致拒绝

**Evidence:** 
日志/代码/行为证据
```

### 🔧 修复计划

```markdown
## Fix Summary

逐步解决方案

### Code / Config Suggestions

代码/配置建议

### Edge Cases / Validation Checks

边界情况/验证检查
```

### 🐙 GitHub Issue 格式

```markdown
## Clear Title

### Context

### Reproduction / Detection Logic

### Fix Steps

### Acceptance Criteria
```

---

## 安装

```bash
# 克隆仓库
git clone https://github.com/atharvnaik1/GraciasAi-Appstore-Policy-Auditor-Opensource.git

# 进入目录
cd GraciasAi-Appstore-Policy-Auditor-Opensource

# 安装依赖
npm install
```

---

## 使用示例

### 1. 扫描 APK/AAB

```javascript
const AndroidAuditor = require('./android-module');

const auditor = new AndroidAuditor();

// 扫描 APK
const report = await auditor.scanAPK('path/to/app.apk');

console.log(report);
```

### 2. 检查特定政策

```javascript
// 检查权限滥用
const permissionsReport = await auditor.checkPermissions('path/to/app.apk');

// 检查数据安全
const dataSafetyReport = await auditor.checkDataSafety('path/to/app.apk');

// 检查广告政策
const adsReport = await auditor.checkAdsPolicy('path/to/app.apk');
```

### 3. 生成修复建议

```javascript
const remediation = await auditor.generateRemediation(report);

console.log(remediation.fixSummary);
console.log(remediation.codeSuggestions);
```

### 4. 创建 GitHub Issue

```javascript
const issue = await auditor.createGitHubIssue(report, {
  repo: 'username/repo',
  labels: ['compliance', 'android', 'high-priority']
});

console.log(`Issue created: ${issue.url}`);
```

---

## API 参考

### `AndroidAuditor`

#### `scanAPK(apkPath)`

扫描 APK 文件并生成合规报告。

#### `checkPermissions(apkPath)`

检查权限滥用问题。

#### `checkDataSafety(apkPath)`

检查数据安全和隐私披露。

#### `checkAdsPolicy(apkPath)`

检查广告和变现政策违规。

#### `generateRemediation(report)`

生成修复建议。

#### `createGitHubIssue(report, options)`

创建 GitHub Issue。

---

## Play Store 政策覆盖

### 权限滥用
- SMS 权限
- 通话记录权限
- 位置权限
- 联系人权限
- 相机/麦克风权限
- 存储权限

### 数据安全
- 数据收集披露
- 数据使用目的
- 数据共享政策
- 用户数据删除
- 隐私政策链接

### 广告政策
- 误导性广告
- 侵入性广告
- 广告披露
- 变现方法披露

### 受限内容
- 成人内容
- 暴力内容
- 仇恨言论
- 用户生成内容审核

---

## 目标

**让报告感觉像是来自资深 Play Store 审核员，而不是通用的 AI 输出。**

---

## Bonus Points 💥

- [ ] 覆盖所有主要政策类别
- [ ] 提供代码级修复建议
- [ ] 生成可操作的 GitHub Issues
- [ ] 支持批量扫描
- [ ] 集成 CI/CD 流程

---

## 测试

```bash
# 运行测试
npm test

# 运行特定测试
npm test -- android-auditor.test.js
```

---

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

---

## 许可证

MIT License - 详见 LICENSE 文件

---

*Android Play Store Auditor Module by 小米辣 (PM + Dev) 🌶️*
