# Gaokao Coach 2027

AI 辅助高考学习辅导与进步追踪系统，面向广东 2027 届新高考考生（物化生）。

## 核心原则
修复真实失分、减少无效努力，不堆砌打卡任务。

## 技术栈
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Dexie.js (IndexedDB) 本地存储，无云依赖
- 数据一键 JSON 导出/导入

## 开始使用
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建
npm run typecheck
```

## 项目结构
- `app/` — 页面（Dashboard、考试、错题、复测、词汇、古诗文、预测、评分、设置）
- `components/` — 表单与 UI 组件
- `lib/` — db.ts / scoring.ts / review-scheduler.ts / forecast.ts / constants.ts
- `config/scoring.json` — 评分权重锁定（执行20/学习效果30/进步50）
- `data/classical-list.json` — 教育部 60 篇古诗文清单
- `types/schema.ts` — TypeScript 类型定义

## 关键约束（不可违反）
- 评分权重锁死 20/30/50 及子权重，结构可调、权重不可改
- D1/D3/D7 按真实日期计算，绝不用"连续答对次数"替代
- 仅 358.77 作进步评分基线，324 仅存档不参与计算
- 考试录入强制标注原始分/等级赋分/是否可比，禁止混加
- 仅可比考试触发预测重算，单次词汇抽查不触发
- 古诗文默认用教育部 60 篇，待学生回校取学校清单后覆盖

## 状态
MVP 已完成核心闭环：录入 → 复测队列 → 评分 → 预测校准 → 数据导出。

历史原型（`gaokao_coach_2027_report.html` 等）已废弃，不再作为正式材料。

## 参考文档
- [Agent handoff prompt](./AGENT_HANDOFF_PROMPT.md)
- 教育部 2019《新高考过渡时期语文学科背诵篇目说明》— 60 篇清单来源
