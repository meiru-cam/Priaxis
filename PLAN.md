# React App 迁移计划

**开始日期**: 2026-01-20
**当前状态**: 进行中

---

## 🎯 目标

将 HTML 版本的 planner app 功能迁移到 React app，并优化任务系统。

---

## 📋 Phase 1: Bug 修复

| ID | 任务 | 状态 |
|----|------|------|
| Bug1 | 创建 ArchivedTaskList 专用组件 | ✅ 完成 |
| Bug2 | 重写热力图 - 填满容器，动态计算周数 | ✅ 完成 |

---

## 📦 Phase 2: 模块 B - 核心数据结构

| ID | 任务 | 状态 |
|----|------|------|
| B1 | 数据导入/导出功能 | ✅ 完成 |
| B2 | 用户档案系统 (Gamification) | ✅ 完成 |

---

## 🔗 Phase 3: 模块 C - 任务层级系统

| ID | 任务 | 状态 |
|----|------|------|
| C1 | Chapter 与 Quest 打通，进度传播 | ✅ 完成 |
| C2 | 指挥中心 + 可折叠树状组件 + 面包屑 | ✅ 完成 |
| C3 | 任务一键转副本 | ✅ 完成 |

---

## 🧠 Phase 4: 模块 D - 智能系统 (Proactive Planner)

> **设计文档**: [docs/PROACTIVE_PLANNER_DESIGN.md](./docs/PROACTIVE_PLANNER_DESIGN.md)

### 核心理念
- **双层 Agent**: Friend (温和提醒) + Coach (深度干预 via Gemini)
- **主动式**: 后台监测，自动干预，而非被动等待
- **Human-in-the-loop**: AI 是顾问，用户是决策者

### Phase 4.1: 基础设施

| ID | 任务 | 状态 |
|----|------|------|
| D1.1 | 创建 `planner-store.ts` 状态管理 | ✅ 完成 |
| D1.2 | 定义 Event Schema (事件类型) | ✅ 完成 |
| D1.3 | 实现 `MonitorEngine` 后台循环 | ✅ 完成 |
| D1.4 | 创建 `StatusIndicator` 红绿灯组件 | ✅ 完成 |

### Phase 4.2: 干预系统

| ID | 任务 | 状态 |
|----|------|------|
| D2.1 | 实现触发器评估逻辑 | ✅ 完成 |
| D2.2 | 创建 `ChatInterface` 对话组件 | ✅ 完成 |
| D2.3 | 实现 Friend 对话 (本地规则) | ✅ 完成 |
| D2.4 | 集成 Gemini API for Coach | ✅ 完成 |

### Phase 4.3: 策略引擎

| ID | 任务 | 状态 |
|----|------|------|
| D3.1 | MoSCoW 建议算法 | ✅ 完成 |
| D3.2 | SMART 检测 & 剪枝建议 | ✅ 完成 |
| D3.3 | Human-in-the-loop 确认流程 | ✅ 完成 |

### Phase 4.4: 复盘系统

| ID | 任务 | 状态 |
|----|------|------|
| D4.1 | 任务完成复盘问卷 | ✅ 完成 |
| D4.2 | 副本总结生成 | ✅ 完成 |
| D4.3 | 周期总结 (周/月) | ✅ 完成 |
| D4.4 | RL 数据结构预留 | ✅ 完成 |

---

## 📝 进度日志

### 2026-01-20
- 创建计划文档
- ✅ Bug1: 创建 ArchivedTaskList 专用组件
- ✅ Bug2: 重写热力图 - GitHub 风格，动态填满容器
- ✅ B1: 数据导入/导出功能 + DataManagementModal
- ✅ B2: 用户档案系统 - PlayerCard + ProfileModal
- ✅ C1: 进度传播系统 - recalculateQuestProgress, propagateProgressUp
- ✅ C2: 指挥中心页面 - HierarchyTree + Breadcrumb
- ✅ C3: 任务一键转副本 - convertTaskToQuest

### 2026-01-20 (第二轮修复)
- ✅ XP 计算修复 - 使用指数增长曲线，防止溢出
- ✅ 玩家档案添加「重置等级」按钮
- ✅ 热力图日期修复 - 使用本地时区，确保包含今天
- ✅ Enter 键误触修复 - 检查 isComposing 防止中文输入法误触
- ✅ AI 分析 JSON 解析容错 - 添加 tryParseJSON 修复截断的 JSON
- ✅ 指挥中心显示截止日期和进度
- ✅ MatrixView 添加任务升级副本功能

### 2026-01-20 (第三轮修复)
- ✅ 称号系统 - 添加手动添加/删除称号功能
- ✅ 热力图日期修复 - 从今天所在周的周六往前计算，确保包含当周
- ✅ 任务完成属性奖励 - 根据 taskType 给予不同属性奖励 (productive→action+intelligence, administrative→agility, social→charm+life)
- ✅ 指挥中心 - 未关联 chapter 的副本折叠到「未分类副本」分组
- ✅ 副本卡片快捷日期编辑 - 直接在卡片上修改截止日期和解锁日期

### 2026-01-20 (第四轮修复)
- ✅ 称号系统重新设计 - 副本完成时自动解锁奖励称号
  - MainQuest 和 Chapter 添加 rewardTitle/rewardXP 字段
  - 副本创建/编辑表单添加奖励设置
  - 副本完成时自动解锁称号和给予 XP
  - ProfileModal 移除手动添加称号功能
- ✅ HierarchyTree toggleChapter 错误修复 - 参数改为可选
- ✅ 指挥中心显示副本截止日期
- ✅ 副本卡片 - 所有状态都显示解锁日期和截止日期编辑
- ✅ 表单字段添加 id/name 属性 - 快速添加任务、副本日期等

### 2026-01-20 (第五轮修复)
- ✅ 主线篇章支持完成奖励称号/XP - Season 和 Chapter 表单添加奖励字段
- ✅ 恢复称号删除功能 - 玩家档案中可以删除自定义称号
- ✅ ChapterFormModal 受控输入警告修复 - 确保所有字段有默认值
- ✅ 指挥中心点击打开编辑Modal - 添加编辑按钮，支持编辑 Season/Chapter/Quest/Task
- ✅ 解锁日期修改后自动更新状态 - updateQuest 自动根据 unlockTime 更新 status
- ✅ 截止日期标红逻辑修复 - 使用本地日期解析，避免时区问题

### 2026-01-20 (第六轮修复)
- ✅ 主线编辑修复 - 编辑时保留篇章的 progress, status, completedAt 等数据
- ✅ 进度传播完善 - 副本完成时自动更新章节进度；章节进度根据关联副本计算
  - updateQuest 触发 recalculateChapterProgress
  - recalculateChapterProgress 考虑完成状态的副本为 100%
  - 所有副本完成时自动将章节标记为完成并解锁奖励
- ✅ 解锁日期逻辑修复 - 使用本地日期解析，明天及之后都是锁定状态
- ✅ 截止日期红绿灯配色:
  - 🟢 绿色: 时间充裕（>3天）
  - 🟡 黄色: 注意（1-3天）
  - 🔴 红色: 紧急（今天到期或已过期）

### 2026-01-20 (第七轮修复)
- ✅ 副本选择列表优化 - 只显示开启状态的副本和篇章，添加图标区分类型
- ✅ 任务快捷编辑 - 在任务卡片展开时显示快捷编辑区域
  - 支持快速修改：截止日期、工作量、任务类型、精力消耗
- ✅ 四象限逻辑修复 - 只有 importance='high' 才算"重要"（之前 medium 也算）
- ✅ 章节进度计算修复:
  - recalculateChapterProgress 现在也检查归档的副本
  - 添加 recalculateAllChapterProgress 批量重算方法
  - 在 checkDailyReset 时自动重算所有章节进度
- ✅ 解锁日期锁定逻辑增强 - 添加日期格式验证和调试日志
- ✅ 表单元素添加 id/name 属性 - 修复静态分析警告

### 2026-01-20 (Phase 4.1 - Proactive Planner 基础设施)
- ✅ 创建 `planner-store.ts` - 智能规划系统状态管理
  - 监测状态、健康指标、事件流
  - 干预系统、对话系统、MoSCoW 建议
  - 复盘数据、DDL 推迟追踪
- ✅ 定义 `types/planner.ts` - 完整的 Event Schema
  - 任务生命周期事件 (task.created/completed/deleted...)
  - 副本事件、干预事件、对话事件、复盘事件
  - 健康指标、风险评估、干预触发器
- ✅ 创建 `intervention-triggers.ts` - 干预触发器配置
  - idle_too_long (2小时无产出)
  - deadline_postponed_twice (DDL 推迟多次)
  - low_daily_completion (今日完成率低)
  - quest_at_risk (副本处于风险)
  - progress_severely_behind (进度严重滞后)
  - 离线模板: Worry vs Facts, 5分钟起步法, 阻碍检查清单等
- ✅ 实现 `MonitorEngine` - 后台监测引擎
  - 每 10 分钟检查健康指标
  - 自动评估红/黄/绿状态
  - 检查触发器条件并触发干预
  - 支持手动检查和状态摘要
- ✅ 创建 `StatusIndicator` 组件 - 红绿灯状态指示器
  - 显示当前健康状态
  - 点击展开详细指标面板
  - 支持开启/关闭监测
  - 手动触发检查

### 2026-01-20 (Phase 4.2 - 干预系统)
- ✅ 创建 `friend-ai.ts` - Friend AI 服务（本地规则）
  - 根据触发类型提供温和的初始响应
  - 关键词检测匹配离线模板
  - 预设动作处理（休息、卡住、任务太大等）
  - 支持升级到 Coach
- ✅ 创建 `coach-ai.ts` - Coach AI 服务（Gemini API）
  - 集成 Google Gemini 2.0 Flash 模型
  - 深度对话分析和建议
  - 任务拆分建议
  - MoSCoW 优先级建议
  - 剪枝决策支持
  - 离线模式降级处理
- ✅ 创建 `ChatInterface` 组件 - 对话界面
  - 支持 Friend/Coach 双层模式
  - 消息气泡、动作按钮、输入框
  - 打字动画指示器
  - 一键升级到 Coach
- ✅ 创建 `InterventionPopup` 组件 - 干预弹窗
  - 滑入式通知
  - 红/黄/绿状态边框
  - 浏览器原生通知（红色状态）
  - 快速响应按钮

### 2026-01-21 (Phase 4.3 - 策略引擎 & Phase 4.4 - 复盘系统)
- ✅ 创建 `strategy-engine.ts` - 策略引擎服务
  - MoSCoW 建议算法
  - SMART 检测 & 剪枝建议
  - 任务优先级排序
- ✅ 创建 MoSCoWCard & SMARTAnalysis 组件
- ✅ Coach AI 支持 OpenAI/Gemini 切换
- ✅ 手动触发 Coach 聊天按钮
- ✅ 修复 Coach 升级循环问题
- ✅ 主题闪烁修复 - index.html 预设主题
- ✅ 创建 `reflection-service.ts` - 复盘服务
  - 任务复盘记录创建
  - 副本总结生成
  - 周期总结生成
  - RL 数据导出
- ✅ 创建 `ReflectionQuestionnaire` - 结构化复盘问卷
  - 满意度、精力状态、亮点、改进点
  - 延迟原因、阻碍应对
  - 快速选项 + 自由输入
- ✅ 创建 `ReflectionModal` - 复盘模态框
  - 整合问卷 + AI 分析
  - 显示分析结果和鼓励
- ✅ 创建 `PeriodSummaryCard` - 周期总结卡片
  - 统计数据、洞察、建议
  - 导出 RL 数据
- ✅ 创建 `QuestSummaryCard` - 副本总结卡片
- ✅ 创建 `SummaryDashboard` - 复盘总结仪表盘
  - 周报/月报列表
  - 生成本周总结
  - 导出 RL 训练数据
- ✅ 添加「复盘总结」导航标签 (/reflection)

