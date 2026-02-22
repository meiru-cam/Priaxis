# Docs Overview

本目录用于记录 Priaxis 的实现现状、架构约束与迭代说明。

## 1) 产品与代码健康

- `CODE_HEALTH_REVIEW.md`：当前项目代码健康评审（含风险分级、优先修复顺序）
- `ENGINEERING_STANDARDS.md`：工程规范与 package 使用指南（新增功能必读）
- `progress-propagation.md`：任务层级反向传播与完成度计算规范

## 2) 按 Tab 的实现文档

- `tabs/daily.md`
- `tabs/quest.md`
- `tabs/season.md`
- `tabs/command-center.md`
- `tabs/weekly.md`
- `tabs/recurring.md`
- `tabs/rewards.md`
- `tabs/spaced-repetition.md`
- `tabs/reflection.md`
- `tabs/ai-agent.md`
- `tabs/profile.md`

## 3) 既有专题文档

- `hierarchy.md`：层级系统
- `ai-system.md`：AI 系统设计
- `ai-router-feature-plan.md`：AI deterministic router 功能规划（后续迭代）
- `command-center.md`：早期指挥中心说明
- `spaced-repetition.md`：间隔复习专题
- `PROACTIVE_PLANNER_DESIGN.md`：主动规划设计
- `SYSTEM_EVENTS.md`：系统事件体系

## 4) 文档维护规则

- 功能行为变化优先更新 `docs/tabs/*`
- 跨 tab 机制变化（如资源系统、AI provider、统一输入框）同步更新 `README.md` 与 `CODE_HEALTH_REVIEW.md`
- 若实现与文档冲突，以代码为准，文档需在同一迭代补齐
