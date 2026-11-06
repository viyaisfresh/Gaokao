# Gaokao Coach 2027 — 项目上下文交接

> **目的**：任何新会话/新窗口打开此文件即可接续开发，无需重新探索代码库。
> **更新日期**：2026-11-06
> **当前版本**：MVP 已交付 + Week 01 训练包 v4 + 学情报告 v2

---

## 1. 项目一句话

面向**广东 2027 届新高考考生**（物化生、当前二模 353.76、目标 480 / 挑战 550）的 AI 辅导 Web 应用。
核心闭环：考试/检测录入 → 失分诊断 → D1/D3/D7 复测 → 掌握度更新 → 进步评分 → 成绩预测校准。

---

## 2. 学生画像（数据基线）

### 已录入考试（按时间序）
| 考试 | 总分 | 性质 | 用途 |
|---|---|---|---|
| 一模前阶段性模考 | 358.77 | comparable · raw 混总 | **进步评分基线**（唯一锚点） |
| 二模 | 353.76 | comparable · 总分赋分 | 已纳入预测 V0.2 |
| ~~~324 那次~~~ | 324 | archived | **不参与任何计算**，仅存档备注 |

### 二模六科细节（赋分口径，2026-11-06 录入）
| 学科 | 分数 | 类型 | 校排 | 班排 |
|---|---|---|---|---|
| 语文 | 74.5 | 科目分数 | 814 | 25 |
| 数学 | 40 | 科目分数 | 806 | 32 |
| 英语 | 53.26 | 折算分 | 805 | 32 |
| 物理 | 49 | 科目分数 | 390 | 9 |
| 化学 | 71 | 赋分成绩 | 334 | 3 |
| 生物 | 66 | 赋分成绩 | 304 | 7 |

**关键诊断**：物化生三科校排靠前（赋分优势已显现），主科（语数英）校排 800+ 是主要拖累。数学 40 / 英语 53.26 是最大短板。

### 学习条件
- 深圳 / 寄宿 / 工作日无自主学习时间 / 周末 4–6h 课外辅导 / 寒假 2–3h/天
- 工作日**不设计任何依赖手机/电脑**的任务
- 周末才是 ChatGPT/MVP 使用窗口

---

## 3. 8 条不可违反的边界

1. **历史 4 份原型文件不找回、不导入**（已废弃）
2. **考试录入强制标注「原始分/等级赋分/是否可比」**，禁止混加
3. **仅 358.77 作进步评分基线**，324 仅存档
4. **古诗文默认预置教育部 60 篇**，待学生回校取学校实际清单后覆盖
5. **单一学生**，schema 不加 `studentId`
6. **直接用 Web MVP**，"明天第一个动作"作为应用内待办
7. **每次可比考试录入即触发预测重算**，不可比考试仅存档
8. **评分权重锁死 20/30/50 与子权重**，结构可调、权重不可调

---

## 4. 技术栈与项目结构

### 技术栈
- **Next.js 14.2.18**（App Router）+ TypeScript 5.6 + Tailwind CSS 3.4
- **Dexie.js 4.0.10**（IndexedDB 封装）—— 浏览器本地存储，无云依赖
- **dexie-react-hooks 1.1.7** —— `useLiveQuery` 响应式查询
- **Vercel CLI 54.x** 部署（仓库 `viyaisfresh/Gaokao`）

### 项目结构
```
gaokao-coach-2027/
├── app/                          # 页面（App Router）
│   ├── layout.tsx · page.tsx     # Dashboard
│   ├── exams/ · wrong-items/ · review/
│   ├── vocab/ · classical/ · forecast/
│   ├── rewards/ · settings/
│   └── globals.css
├── components/
│   ├── ExamForm.tsx · WrongItemForm.tsx · VocabTestForm.tsx
│   ├── ClassicalTestForm.tsx · ReviewQueueList.tsx · DailyActionCard.tsx
│   ├── DbProvider.tsx            # 客户端 Dexie 初始化
│   └── ui/Card.tsx
├── lib/
│   ├── db.ts                     # Dexie schema + genId
│   ├── scoring.ts                # 评分纯函数（20/30/50）
│   ├── review-scheduler.ts       # D1/D3/D7 真实日期计算
│   ├── forecast.ts               # 先验 + 经验贝叶斯更新
│   └── constants.ts              # BASELINE_SCORE=358.77 / GAOKAO_DATE=2027-06-07
├── config/scoring.json           # 权重锁定（前端只读）
├── data/
│   ├── exam-results.json         # 仓库源 · 学生大考成绩（最新：二模 353.76）
│   └── classical-list.json       # 教育部 60 篇
├── types/schema.ts               # 全部 TypeScript 类型
├── docs/
│   ├── study-plan.md             # 学习计划表（秋季后半程）
│   ├── week-01/                  # 训练包 v4（data.json + day-01..05-student.html + answers.html）
│   └── gaokao-coach-2027-report-v2.html  # 学情报告 v2（已同步到 ~/Downloads）
├── prototypes/                   # 废弃原型存档
├── reports/                      # 旧报告存档
└── AGENT_HANDOFF_PROMPT.md       # 原始 handoff（项目起点）
```

---

## 5. 数据模型（Dexie tables）

完整定义见 `types/schema.ts`。核心表：

| 表 | 主键 | 用途 |
|---|---|---|
| `exams` | id | 考试记录（含 isBaseline / isArchived / comparability） |
| `wrongItems` | id | 错题（含 reviewResults 多次复测、transferredToNewQuestion） |
| `reviewTasks` | id | D1/D3/D7 复测任务（按 scheduledDate 排序） |
| `vocabTests` | id | 词汇检测（results[] 含 N/F/S/M/C 分类） |
| `classicalRecords` | id | 古诗文默写/翻译记录（含 schoolListVerified） |
| `forecasts` | id | 预测快照（每次重算追加一条，可回看历史） |
| `rewards` | id | 激励台账（执行/学习效果/进步三段分数） |
| `dailyActions` | id | "明天第一个动作"待办 |

### Exam schema 关键字段
```ts
interface Exam {
  id: string;
  date: string;                  // YYYY-MM-DD
  examType: string;              // "二模" / "阶段性模考" 等
  isBaseline: boolean;           // 仅 358.77 那次为 true
  isArchived: boolean;           // 324 那次为 true
  totalScore: number;
  totalScoreType: 'raw' | 'ranked';
  subjectScores: {
    subject: Subject;
    rawScore: number;
    rankedScore?: number;        // 物化生赋分才填
    scoreType: 'raw' | 'ranked';
    comparability: 'comparable' | 'incomparable';
  }[];
  notes?: string;
}
```

---

## 6. 核心算法

### 评分引擎（`lib/scoring.ts` + `config/scoring.json`）
```
总分 = 执行(20) + 学习效果(30) + 进步(50)

学习效果 = 复测(40%) + 费曼(20%) + 迁移(40%)
  · 首次通过 = 100%
  · 提示后通过 = 60%
  · 关键步骤后通过 = 30%
  · 两次失败 = 0%
  · 延迟复测通过补回 50%

进步 = 考试进步(60%) + 知识掌握度(40%)
  · 考试进步 = (latest - 358.77) / 358.77，不封顶不设底
  · 知识掌握度 = 已掌握知识点 / 总知识点
```
权重锁死在 `config/scoring.json`，UI 只读不可改。

### 复测调度（`lib/review-scheduler.ts`）
```ts
scheduleReview(firstErrorDate) → { d1, d3, d7 }  // 真实日期，不是"连续答对 N 次"
```
每次 WrongItem 创建即生成 3 个 ReviewTask。复测失败则重新排期（如 D1 失败 → D1+1）。

### 预测校准（`lib/forecast.ts`）
```ts
recomputeForecast(comparableExams, prior) → ScoreForecast
```
- `sampleSize === 0` → 返回先验，V0.1
- `sampleSize === 1` → 维持先验，标注 sampleSize=1
- `sampleSize >= 2`：
  - `priorWeight = max(0.2, 1 - sampleSize * 0.15)`（2 次=0.7，3 次=0.55，4 次=0.4，5+ 次=0.2）
  - `changePct = (latest.totalScore - 358.77) / 358.77`
  - `projectedMean = 358.77 * (1 + changePct)`
  - `projectedStd = 30 + max(0, 10 - sampleSize * 2)`
  - 各区间按正态密度计算 evidence，与先验加权融合
- `version = V0.${1 + floor(sampleSize / 2)}`（2 次=V0.2，3-4 次=V0.3，5-6 次=V0.4）
- `confidenceLevel`: <3=low, 3-4=medium, ≥5=high
- `shouldTriggerRecompute(exam)` = `!isArchived && any subjectScore.comparability === 'comparable'`

### 当前预测状态（V0.2，2 次可比考试）
| 区间 | V0.1 先验 | V0.2 校准 |
|---|---|---|
| 400 以下 | 12% | 13% |
| 400–449 | 30% | 31% |
| 450–479 | 28% | 27% |
| 480–499 | 16% | 15% |
| 500–519 | 8% | 8% |
| 520–549 | 4% | 4% |
| 550+ | 2% | 2% |

---

## 7. 关键文件清单（高频访问）

| 文件 | 作用 | 修改时注意 |
|---|---|---|
| `app/settings/page.tsx` | 含「从仓库导入最新大考」按钮 | 导入后必须显式调用 `recomputeForecast` + `db.forecasts.add` |
| `components/ExamForm.tsx` | 手动录入考试的标准模式 | 导入按钮的模式参考此文件 lines 98-118 |
| `lib/forecast.ts` | 预测算法 | 改算法后历史快照不重算，仅新录入触发 |
| `lib/db.ts` | Dexie schema | 升级 schema 必须加 version + upgrade 函数 |
| `data/exam-results.json` | 仓库源数据 | 学生更新大考成绩后通过 git push 同步 |
| `types/schema.ts` | 类型单一来源 | 任何表结构变更先改这里 |
| `docs/week-01/data.json` | 训练包源数据 | v4 schema：vocab[day1-5].words[20] + cloze + classical[5]（无 rewrite/feynman 字段） |
| `docs/gaokao-coach-2027-report-v2.html` | 学情报告 | 学生侧可打印 PDF |

---

## 8. Week 01 训练包（v4 当前形态）

**位置**：`docs/week-01/`
- `data.json` — 单一数据源（_meta + vocab[day1-5] + classical[5]）
- `day-0[1-5]-student.html` — 学生作答版（5 份）
- `day-0[1-5]-answers.html` — 答案版（5 份）

**v4 结构（每份 student.html）**：
1. **完形填空**（20 空 × 4 选项，改编自 2025 全国一卷真题）
2. **四阶梯单测**（每词 4 栏）：
   - ① 英→中（识别）
   - ② 中→英（拼写）
   - ③ 造句（产出）
   - ④ **费曼讲解**（v4 关键变化：从「迁移改写」改为费曼提问，回答用法边界）
3. **古诗文两件套**（v4 砍掉改写和费曼提问）：
   - 默写（`answer-box.tall` min-height 360px，已为打印放大）
   - 翻译（`answer-box.tall-md` min-height 280px，含易错字提示）
4. **自评反思**（5 行表格）

**五级分类**：N 未接触 / F 见过遗忘 / S 拼写错 / M 词义用法错（含造不出句、费曼讲不清）/ C 完全正确。仅 C 不入 MVP。

**5 天主题**：
- Day 1：阅读理解核心名词（环保与科技类）
- Day 2：阅读理解核心动词与形容词（教育与表达类）
- Day 3：完形填空核心动词（情感与生活类）
- Day 4：语法填空核心词（围棋展览文本）
- Day 5：高考写作高频功能词（应用文 + 续写）

**古诗文 5 篇**：《劝学》《鹊桥仙·纤云弄巧》《苏幕遮·燎沉香》《念奴娇·赤壁怀古》等（具体见 data.json）

---

## 9. 学情报告 v2（`docs/gaokao-coach-2027-report-v2.html`）

相对 v1 原型（`~/Downloads/gaokao_coach_2027_report.html`）的关键变化：
- 最新大考从「358.77 单次」更新为「二模 353.76 + 基线 358.77」两次可比
- 六科全部替换为二模实况，每科追加校排
- 预测升级 V0.1 → V0.2（先验 100% → 70%，趋势证据 30%）
- 新增「预测快照历史」模块（V0.1 → V0.2 → V0.3 → V1.0 演进路径）
- 策略调整：化学/生物从「主攻」转「稳分·停止加码」，周末 5h 重排为数学 120m + 英语 90m
- 阶段一标注 active 状态
- 「接下来最重要的行动」按本周/本月/本学期分层

打印方式：浏览器打开 → 打印 → 保存为 PDF。

---

## 10. 当前任务状态（2026-11-06）

### 已完成
- ✅ MVP 核心闭环：录入 → 复测队列 → 评分 → 预测校准 → 数据导出
- ✅ Week 01 v4 训练包（5 天 × 20 词 + 5 篇古诗文，已对齐 2025 全国一卷真题）
- ✅ 古诗文默写空格放大（打印优化）
- ✅ 学情报告 v2（含二模数据 + V0.2 预测）
- ✅ Settings 页「从仓库导入最新大考」按钮（读 `data/exam-results.json`，去重，触发预测重算）
- ✅ 已 commit + push 到 origin/main（commit `98fc3a9`）

### 待办
- [ ] **Vercel 部署**：上次会话被中断前未完成 `vercel --prod` 部署。下次接续时：
  ```bash
  cd /Users/admin/gaokao-coach-2027
  vercel --prod  # 或 vercel deploy --prod
  ```
  确认 `vercel` CLI 已登录，项目已 link。
- [ ] **学生侧使用反馈**：周末让学生实际用一次，姐姐下周抽查数据完整度
- [ ] **三模数据录入**：等下次可比考试（月考/三模）出分后，更新 `data/exam-results.json` → push → 学生在 settings 点「从仓库导入」即可触发 V0.3 预测
- [ ] **学校古诗文清单核对**：学生回校取学校实际下发的 60 篇清单，与 `data/classical-list.json` 对比，不一致则在 settings 点「标记所有记录已核对学校清单」
- [ ] **Week 02 训练包**：v4 模式已稳定，下周按同结构生成（待周末反馈）

---

## 11. 开发命令速查

```bash
# 本地开发
cd /Users/admin/gaokao-coach-2027
npm run dev          # http://localhost:3000
npm run build        # 生产构建
npm run typecheck    # tsc --noEmit

# 部署
vercel --prod

# 数据备份（学生侧操作）
# 浏览器打开 app → Settings → 导出 JSON → 保存到本地

# 数据恢复（学生侧操作）
# Settings → 导入 JSON → 选备份文件

# 从仓库同步最新大考（学生侧操作）
# Settings → 「从仓库导入最新大考」按钮
# 会自动写入 db.exams 并触发 recomputeForecast
```

---

## 12. 关键代码片段（导入按钮模式）

`app/settings/page.tsx` 中的 `handleImportFromRepo`：
```ts
import examResultsData from "@/data/exam-results.json";  // resolveJsonModule 已开

// 1. 读取 data.exam-results.json（构建时打包）
// 2. 按 examType+date 去重
// 3. 映射 subjects：chinese/math/english → raw；physics/chemistry/biology → ranked
// 4. totalScoreType: "总分赋分成绩" → ranked
// 5. bulkAdd to db.exams
// 6. 显式调用 recomputeForecast(comparableExams) + db.forecasts.add
//    （与 ExamForm.tsx lines 112-118 模式一致）
```

**注意**：`data/exam-results.json` 是构建时打包的 JSON 模块，**不是**运行时 fetch。学生更新仓库后必须重新部署 Vercel 才能在前端看到新数据。

---

## 13. Git 仓库

- **仓库**：`viyaisfresh/Gaokao`（private）
- **分支**：main
- **最近 commit**：
  - `98fc3a9` feat(settings): 从仓库导入最新大考按钮
  - `e363828` data: add second mock exam results
  - `8db8273` chore: remove superseded v0/v1 week-01 HTML files
  - `e3f928b` docs: enlarge 默写 blanks in 5 student HTML files for printing
  - `f3bc805` docs: week-01 pack v4 — 古诗文回到默写+翻译，词汇 ④ 改为费曼讲解
  - `4b4432b` docs: week-01 pack v3 — cloze + 4-stage vocab, aligned to 2025 全国一卷真题

---

## 14. 用户协作偏好（来自 CLAUDE.md / 既往反馈）

- 讨论技术方案用大白话，避免行话缩写（用户是产品/运营视角）
- 报告每个数字必须标注口径（底表全量 / 实读样本 / 早期判定），不混用
- 时序图用底表全量，不能用实读样本
- SVG 画板不画饼图/反向条，优先水平条/堆叠条/双轴柱+折线/漏斗
- 报告「看起来累」立即 overwrite，不要 patch-on-patch
- 创作者 ID 必须替换为用户名+主页 URL（如适用）
- 优先级定义：S > P0 > P1（S 是最高，不是次要）

---

## 15. 下次新会话接续指引

如果你是新的 Claude 会话，看到这份文件：

1. **先读这份文件**了解全局
2. **运行 `git status` + `git log --oneline -5`** 确认本地状态
3. **如果学生提供了新的大考成绩**：
   - 更新 `data/exam-results.json`（按现有 schema）
   - commit + push
   - `vercel --prod` 重新部署
   - 学生在 settings 点「从仓库导入最新大考」即可触发预测升级
4. **如果要继续生成 Week 02 训练包**：
   - 复用 `docs/week-01/data.json` 的 v4 schema
   - 用 5 个并行 subagent 分别生成 5 天（每天 20 词 + 1 篇古诗文 + 完形）
   - 词源优先用 2025 全国一卷真题对应题型的高频词
   - 古诗文按必背 60 篇清单推进
5. **如果要调整预测算法**：
   - 改 `lib/forecast.ts` 的 `recomputeForecast`
   - 历史快照不重算，仅新录入触发新版本
   - 在 `config/scoring.json` 注释里记录算法版本
6. **如果学生反馈某个训练包题目不好**：
   - 优先排查 data.json 的 cloze passage 是否有重复词、空格数与词数是否匹配
   - 用 Python 脚本验证（`python3 -c "..."`）
   - 修改后重新生成对应 student.html + answers.html

---

## 16. 不做的事（明确边界）

- ❌ OCR 试卷识别（手动录入先行）
- ❌ 移动端原生 App
- ❌ 云同步、多用户、账号系统
- ❌ 自动生成练习 PDF（历史 PDF 已有乱码问题，暂停）
- ❌ 把 324 那次成绩纳入计算
- ❌ 工作日设计需要手机/电脑的任务
- ❌ 擅自假设学校背诵清单与教育部 60 篇完全一致
- ❌ 在数据不足时输出精确预测
- ❌ 增加打卡负担（学习效率只做每周抽样）
- ❌ 重新发明 handoff 已确认的机制（评分权重、D1/D3/D7、N/F/S/M/C 等）

---

**文件位置**：`/Users/admin/gaokao-coach-2027/PROJECT_CONTEXT.md`
**同步到 Downloads**：`cp /Users/admin/gaokao-coach-2027/PROJECT_CONTEXT.md /Users/admin/Downloads/`
