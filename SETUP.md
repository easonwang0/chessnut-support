# Chessnut Support — 安装部署指南

## 一、系统概览

全自动 Freshdesk 工单分诊系统，包含：

| 组件 | 用途 |
|------|------|
| `scripts/freshdesk-triage-v2.py` | 常规分诊：拉取过去 6h 工单，分类、关闭 spam、分派+起草回复 |
| `scripts/freshdesk-catchup.py` | 补漏扫描：拉取过去 24h 工单，找出遗漏的重新处理 |
| `scripts/send-feishu.py` | 飞书推送：将报告发送到指定飞书用户 |
| `scripts/apply_triage.js` | 执行分诊决策（写 Private Note + 打标签 + 分派） |
| `scripts/fetch_tickets.js` | 拉取待处理工单（供 AI 分析用） |
| Cron: `triage-4h` | 每 4 小时自动分诊 |
| Cron: `triage-catchup` | 每天 00:00 和 12:00 补漏扫描 |

## 二、前置依赖

### 2.1 凭据文件

创建 `~/.openclaw/credentials/chessnut-services.json`：

```json
{
  "freshdesk": {
    "domain": "chessnutech.freshdesk.com",
    "api_key": "YOUR_FRESHDESK_API_KEY",
    "triage_group_id": 150000248275,
    "agents": {
      "gwen": 150033754311,
      "lena": 150073233500,
      "jennifer": 150023804601,
      "jony": 150022830364
    },
    "official_agent_id": 150018815546,
    "protected_groups": [
      150000414284,
      150000414287,
      150000414286,
      150000414285
    ]
  },
  "github": {
    "repo": "https://github.com/easonwang0/chessnut-support",
    "token": "YOUR_GITHUB_TOKEN"
  },
  "shopify": {
    "domain": "chessnutech.myshopify.com",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "access_token": "YOUR_ACCESS_TOKEN",
    "scope": "read_customers,read_orders"
  },
  "track17": {
    "api_key": "YOUR_17TRACK_API_KEY",
    "base_url": "https://api.17track.net/track/v2.2",
    "token": "YOUR_17TRACK_TOKEN"
  }
}
```

### 2.2 飞书推送配置

编辑 `scripts/send-feishu.py`，修改顶部三个常量：

```python
APP_ID = "cli_xxxxx"           # 飞书应用 App ID
APP_SECRET = "xxxxx"           # 飞书应用 App Secret
USER_ID = "ou_xxxxx"           # 接收消息的用户 open_id
```

飞书应用需要 `im:message:send_as_bot` 权限。

### 2.3 Python 依赖

```bash
# 标准库即可，无额外依赖
python3 --version  # 需要 3.8+
```

### 2.4 Node.js 依赖

```bash
cd skills/chessnut-support
npm install  # 安装 package.json 中的依赖
```

## 三、手动运行测试

### 3.1 常规分诊

```bash
cd ~/.openclaw/workspace
python3 scripts/freshdesk-triage-v2.py
```

输出：处理报告 + 已在 Freshdesk 上完成分派和草稿。

### 3.2 补漏扫描

```bash
# 默认扫描过去 24 小时
python3 scripts/freshdesk-catchup.py 24

# 也可以指定其他时间窗口
python3 scripts/freshdesk-catchup.py 12
```

### 3.3 推送报告到飞书

```bash
# 方式一：参数传入
python3 scripts/send-feishu.py "报告内容"

# 方式二：管道传入
cat report.md | python3 scripts/send-feishu.py
```

## 四、定时任务配置

### 4.1 triage-4h（常规分诊，每 4 小时）

```bash
openclaw cron add \
  --name "chessnut-triage-4h" \
  --cron "0 */4 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --model "xiaomi-coding/mimo-v2-pro" \
  --thinking low \
  --timeout-seconds 900 \
  --no-deliver \
  --message '你是 Chessnut 客服工单分诊助手。请严格按以下步骤执行：

步骤1：运行 fetch 脚本拉取待处理工单
cd /root/.openclaw/workspace/skills/chessnut-support && node fetch_tickets.js

步骤2：读取 /root/.openclaw/workspace/skills/chessnut-support/pending_tickets.json，里面有 toClose（自动关闭的spam）和 toAnalyze（需要你分析的工单）。

步骤3：读取知识库 /root/.openclaw/workspace/skills/chessnut-support/FAQ_KNOWLEDGE_BASE.md，里面有标准回复模板。

步骤4：对 toAnalyze 中的每个工单，认真阅读 subject 和 body，理解客户的真实意图。
- 分派规则：产品咨询（Air/Go/Air+/Pro→Jennifer，Move/Evo→Gwen），PayPal纠纷→Jony，订单/物流/退款→Lena，KOL/合作→Jennifer，其他→Jennifer

步骤5：为每个分派的工单，根据知识库中的标准回复模板，起草一个建议回复。回复要求：
- 用客户邮件的同种语言
- 专业、友好、简洁
- 引用知识库中对应的模板

步骤6：将分析结果写入 /root/.openclaw/workspace/skills/chessnut-support/triage_decisions.json

步骤7：运行 apply 脚本
cd /root/.openclaw/workspace/skills/chessnut-support && node apply_triage.js

步骤8：生成处理报告

步骤9：【必须执行】用 exec 运行以下命令把报告发到飞书：
cat /tmp/triage_report.md | python3 /root/.openclaw/workspace/scripts/send-feishu.py
如果 /tmp/triage_report.md 不存在，把报告内容作为参数传入：
python3 /root/.openclaw/workspace/scripts/send-feishu.py "报告内容"'
```

### 4.2 triage-catchup（补漏扫描，每天 00:00 和 12:00）

```bash
openclaw cron add \
  --name "chessnut-triage-catchup" \
  --cron "0 0,12 * * *" \
  --tz "Asia/Shanghai" \
  --exact \
  --session isolated \
  --model "xiaomi-coding/mimo-v2-pro" \
  --thinking low \
  --timeout-seconds 600 \
  --no-deliver \
  --message '你是 Chessnut 客服工单补漏检查助手。

任务：检查过去 24 小时的 Freshdesk 工单，找出之前分诊遗漏的工单并处理。

步骤1：运行补漏扫描脚本
cd /root/.openclaw/workspace && python3 scripts/freshdesk-catchup.py 24

步骤2：分析脚本输出的 JSON 结果：
- total: 过去24小时的工单总数
- unprocessed_count: 未处理的工单数
- unprocessed: 未处理工单列表

步骤3：如果 unprocessed_count 为 0，报告"过去24小时无遗漏工单 ✅"，然后执行步骤6。

步骤4：如果有未处理工单，逐个处理：
- 读取知识库 FAQ_KNOWLEDGE_BASE.md
- 获取 ticket 详情和 requester email，判断是否 spam
- 获取 conversation 了解上下文
- 分类规则：spam/系统通知→关闭(status=5,tag=auto-spam-closed)，订单/物流→Lena，Move/Evo产品问题→Gwen，Air/Pro/Go产品问题→Jennifer，PayPal纠纷→Jony，KOL/合作→Jony，其他→Jennifer
- 写 Private Note 起草回复
- 分派给对应 agent 并打标签(ai-draft-ready)

步骤5：生成处理报告

步骤6：【必须执行】用 exec 运行以下命令把报告发到飞书：
python3 /root/.openclaw/workspace/scripts/send-feishu.py "报告内容"
如果报告太长，先写入文件再 cat 管道：
cat /tmp/catchup_report.md | python3 /root/.openclaw/workspace/scripts/send-feishu.py'
```

## 五、分诊规则

### 5.1 Agent 分工

| Agent | 负责范围 | Freshdesk ID |
|-------|---------|--------------|
| Gwen Liu | Move、Evo 产品问题 | 150033754311 |
| Lena Wang | 订单、物流、退款、折扣码 | 150073233500 |
| Jennifer Chen | Air/Pro/Go 产品问题 + 默认兜底 | 150023804601 |
| Jony He | PayPal 争议、KOL/合作 | 150022830364 |

### 5.2 过滤规则

**Layer 1 — 发件人过滤（自动关闭）：**
- `@mailer.shopify.com` → Shopify 通知
- `donotreply@amazon.com` → Amazon 通知
- `@paypal.com`（service/noreply） → PayPal 通知
- `@facebookmail.com` → Facebook 通知
- `@impact.com` → Impact 通知
- 等等

**Layer 2 — 内容过滤（自动关闭）：**
- "Notification of payment received"
- "Amazon has shipped your sold item"
- "Refund Initiated for Order"
- 等等

**Layer 3 — 意图分类 + 分派：**
- 含争议关键词（PP-R-xxx, dispute, chargeback）→ Jony
- 含产品问题关键词（not working, broken, defect）→ 根据产品型号分派
- 含订单关键词（order, shipping, tracking）→ Lena
- 其他 → Jennifer（兜底）

### 5.3 保护分组（不处理）

- Kyle Wang (150000414284)
- Minmin Hong (150000414287)
- Stella Liu (150000414286)
- Basilia Wang (150000414285)

这些属于 Chessnut Official 组，不在分诊范围内。

## 六、报告格式

### 6.1 常规分诊报告

```
📋 Freshdesk 分诊报告 — YYYY-MM-DD HH:00

━━━ #XXXXX → Agent 📝 已有草稿 ━━━
标题: ...
摘要: ...
起草: ...

共处理 X 张工单 ✅
├─ 分配 + 草稿: X 张
│  ├─ Lena: X 张
│  ├─ Jennifer: X 张
│  ├─ Gwen: X 张
│  └─ Jony: X 张
└─ 自动关闭: X 张
```

### 6.2 补漏报告

```
📋 Freshdesk 补漏报告 — YYYY-MM-DD HH:00

检查窗口：过去 24 小时
总工单数：X | 遗漏：Y | 本次处理：W

🗑️ 自动关闭：X 张
📝 分派：X 张
  - Lena: X 张
  - Jennifer: X 张
  - Gwen: X 张
  - Jony: X 张
```

## 七、文件结构

```
skills/chessnut-support/
├── SETUP.md                    ← 本文件
├── SKILL.md                    ← Agent 技能定义
├── TRIAGE_RULES.md             ← 分诊规则详细文档
├── FAQ_KNOWLEDGE_BASE.md       ← 标准回复模板（A1-A45）
├── scripts/
│   ├── freshdesk-triage-v2.py  ← 常规分诊脚本
│   ├── freshdesk-catchup.py    ← 补漏扫描脚本
│   ├── send-feishu.py          ← 飞书推送脚本
│   ├── fetch_tickets.js        ← 拉取工单
│   ├── apply_triage.js         ← 执行分诊决策
│   └── generate_triage.js      ← 生成分诊报告
├── package.json
├── triage_decisions.json       ← 分诊决策输出
├── triage_state.json           ← 处理状态记录
└── pending_tickets.json        ← 待处理工单缓存

memory/
├── freshdesk-triage-YYYY-MM-DD-HHMM.md    ← 常规分诊报告存档
└── freshdesk-triage-YYYY-MM-DD-catchup.md  ← 补漏报告存档
```

## 八、验证安装

安装完成后运行以下检查：

```bash
# 1. 检查凭据
cat ~/.openclaw/credentials/chessnut-services.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅ 凭据 OK' if d.get('freshdesk',{}).get('api_key') else '❌ 缺 Freshdesk API Key')"

# 2. 检查飞书推送
python3 ~/.openclaw/workspace/skills/chessnut-support/scripts/send-feishu.py "🔧 安装测试消息"

# 3. 检查定时任务
openclaw cron list | grep chessnut

# 4. 手动跑一次分诊
cd ~/.openclaw/workspace && python3 scripts/freshdesk-triage-v2.py
```

## 九、版本历史

- **v1.0 (2026-04-12)**: 稳定版本
  - 常规分诊 (triage-4h) + 补漏扫描 (triage-catchup)
  - 飞书推送 (send-feishu.py)
  - 完整的 spam 过滤、意图分类、自动分派+起草回复
