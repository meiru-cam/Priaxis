# Command Center Tab (`/command-center`)

## 入口

- 页面：`src/features/command-center/CommandCenterPage.tsx`
- 主要组件：`HierarchyTree`, `Breadcrumb`

## 当前实现

- 统一树状视图：Season → Chapter → Quest → Task
- 面包屑导航与详情面板联动
- 详情区支持从当前节点直接编辑（弹出对应 modal）
- 可查看关联任务/副本与进度信息

## 关键状态来源

- `useGameStore`（主线、副本、任务、分类）

## 使用定位

- 适合做“跨层级排查”和“结构化编辑入口”
- 与各 tab 相比，指挥中心更偏全局观察

## 风险与待优化

- 树节点较多时，渲染性能和过滤可读性是后续优化点

