# Priaxis

Priaxis is a personal execution system that combines:
- goal hierarchy (`Season -> Chapter -> Quest -> Task`)
- daily execution workflows
- AI-assisted reflection and intervention
- gamified feedback (XP, rewards, progression)

Priaxis 是一个个人执行系统，结合了：
- 目标层级（`主线 -> 章节 -> 副本 -> 任务`）
- 每日执行流程
- AI 辅助复盘与干预
- 游戏化反馈（XP、奖励、成长）

## Name Origin / 名字来源

### EN
`Priaxis` is derived from **Priority + Praxis**.
- **Priority**: focus on what matters first. This aligns with Pareto (80/20), Eisenhower prioritization, and SMART goal setting.
- **Praxis** (Greek: πρᾶξις): action, practice, and turning ideas into execution.

Together, Priaxis means focused action: identify the most important work, then execute it deliberately.

### 中文
`Priaxis` 来自 **Priority + Praxis**。
- **Priority（优先级）**：先做最重要的事，对应 28 法则（帕累托）、四象限法、SMART 目标等方法中的“先排序”。
- **Praxis（πρᾶξις，实践/行动）**：把理论转化为可执行行动。

两者组合后的含义是：先聚焦关键，再把关键事项真正落实。

## Quick Start (EN)

### 1. Install
```bash
npm install
```

### 2. Configure env
```bash
cp .env.example .env
```

Required values in `.env`:
- `VITE_AI_PROVIDER=gemini|openai`
- `GEMINI_API_KEY` and/or `OPENAI_API_KEY`
- `BRIDGE_TOKEN` and `VITE_BRIDGE_TOKEN` (recommended when bridge token is required)

### 3. Run frontend (dev)
```bash
npm run dev
```

### 4. Run bridge (optional, for MCP/system integration)
```bash
npm run bridge
```

### 5. Production preview
```bash
npm run build
npm run preview
```

## 快速开始（中文）

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
```

`.env` 至少建议配置：
- `VITE_AI_PROVIDER=gemini|openai`
- `GEMINI_API_KEY` / `OPENAI_API_KEY`
- `BRIDGE_TOKEN` 与 `VITE_BRIDGE_TOKEN`

### 3. 启动前端开发服务
```bash
npm run dev
```

### 4. 启动 Bridge（可选，MCP/系统干预功能需要）
```bash
npm run bridge
```

### 5. 生产构建与预览
```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev`: Vite dev server
- `npm run build`: TypeScript build + Vite build
- `npm run preview`: preview built app
- `npm run lint`: eslint check
- `npm run bridge`: run local MCP bridge
- `npm run check:public`: scan tracked files for obvious hardcoded secrets

## Public Release Checklist

Before publishing this repo publicly:
1. Run `npm run check:public`
2. Ensure `.env` is not committed
3. Run `npm run build`
4. Verify README and docs are up to date

## Documentation

- `docs/README.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/CODE_HEALTH_REVIEW.md`
- `docs/tabs/` for module-level docs
