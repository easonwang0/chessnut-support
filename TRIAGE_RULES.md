# Chessnut Freshdesk 工单分诊规则

## 一、处理范围

### 可处理的工单
- **Group: Customer Support** (ID: 150000248275) — 所有新工单先进入这里
- **Group: --** (group_id = null) — 无分组工单

### 绝对不动
- **Kyle Wang** (150000414284)
- **Minmin Hong** (150000414287)
- **Stella Liu** (150000414286)
- **Basilia Wang** (150000414285)

以上4个分组的工单由 **Chessnut Official** (ID: 150018815546) 处理，一律跳过。

---

## 二、Agent 信息

| Agent | ID | 负责内容 |
|-------|-----|---------|
| Gwen Liu | 150033754311 | EVO、Move 硬件和软件 |
| Lena Wang | 150073233500 | 订单、物流、发货、取消订单、地址修改、发票 |
| Jennifer Chen | 150023804601 | Air/Pro/Go 硬件和软件、**兜底** |
| Jony He | 150022830364 | PayPal Case、Payoneer 争议、品牌合作、媒体请求 |

---

## 三、分诊流程（漏斗模型）

### 第1层：系统通知过滤 → 自动关闭

**按发件人关闭（Layer 1a）：**

| 发件人 | 处理 |
|--------|------|
| `@mailer.shopify.com` / `@shopify.com`（含 Shopify Inbox `no-reply@mailer.shopify.com`） | 关闭 |
| `donotreply@amazon.com` / `@amazon.*` noreply | 关闭 |
| `@marketplace.amazon.*` / `@sellernotifications.*` | 关闭 |
| `noreply@facebookmail.com` / `@facebookmail.com` | 关闭 |
| `@mailchimp.com` / `@mandrillapp.com` | 关闭 |
| `@fuuffy.com` | 关闭 |
| `@impact.com` / `@mediapartners` | 关闭 |
| `@paypal.com` (noreply/service，非争议) | 关闭 |
| `@pplcz.com` / `@ppl-pk.com` | 关闭 |
| `@tiktok.com` / `@business.tiktok` | 关闭 |
| `@aliexpress.com` (noreply/seller) / `@service.aliexpress` / `@info.aliexpress` | 关闭 |
| `@slickdeals.net` | 关闭 |
| `@noreply.*` / `@no-reply.*` / `@donotreply.*` (通用) | 关闭 |
| `@mailer.*` / `@notifications.*` / `@bounce.*` (通用) | 关闭 |
| **`no-reply@mailsupport.aliyun.com`** | **不关闭！转 Jennifer**（退信通知） |

**按内容关闭（Layer 1b）：**
- "Notification of payment received" / "has authorized a payment to you"
- Amazon 多语言通知（德语/意大利语/西班牙语/法语/芬兰语）
- 速卖通：违背发货承诺、订单关闭、订单已通过风控审核
- Fuuffy：運單派送延誤、訂單收據、訂單確認
- Facebook：你的广告已通过审核、视频无法显示
- "left a X star review for"（评价通知）
- Payoneer 收款通知
- 广告/垃圾邮件
- Slickdeals 促销通讯

**操作：** status=5, group_id=null, tags 加 `auto-spam-closed` + `sender-based`

### 第2层：争议/Cases → Jony He
- PayPal Case（PP-R-xxx、buyer has filed a case）
- Payoneer 争议/chargeback
- 速卖通纠纷

**操作：** group_id=null, responder_id=Jony

### 第3层：产品咨询 → Gwen Liu / Jennifer Chen

**关键：对来信内容进行识别，判断是否涉及产品**

| 产品 | 问题类型 | 指派 |
|------|---------|------|
| Move / Evo | 硬件故障、软件问题、使用咨询、兼容性、设置指导 | **Gwen** |
| Air / Air+ / Pro / Go | 硬件故障、软件问题、使用咨询、兼容性、设置指导 | **Jennifer** |
| 不确定型号 | 产品问题 | **Jennifer** |

**触发条件（满足任一即进入 L3）：**
1. 明确的硬件/软件问题关键词（defective、broken、can't connect、firmware、app crash 等）
2. 产品名 + 使用咨询关键词（how do I、compatible、work with、setup、help with 等）

**操作：** group_id=null, responder_id=对应 Agent

### 第4层：订单/物流 → Lena Wang
- 订单查询（含订单号、purchase number）
- 发货时间、物流跟踪
- 取消订单、退款
- 修改地址
- 发票
- 保修/配送咨询
- 缺少物品
- 催发货
- 售前咨询（价格、运费、退货政策）
- 产品功能介绍

**操作：** group_id=null, responder_id=Lena

### 第5层：KOL/合作 → Jennifer Chen
- YouTube / TikTok / 社交媒体合作
- Influencer / KOL 请求
- 赞助请求

### 第6层：兜底 → Jennifer Chen
- 无法判断分类的工单
- 不确定的工单

---

## 四、特殊规则

### 回复处理
**客户回复 Chessnut 发出的邮件（"Re: Message from Chessnut"、"Re: A shipment from order..."等）→ 回给发出该邮件的 Agent（通常是 Jennifer Chen）**

不要按回复内容机械分类，要看是谁发起的对话。

### 发件人获取
- `ticket.requester_email` 在 Freshdesk 列表 API 里经常为空
- 必须通过 `requester_id` → `/contacts/{id}` 获取真实邮箱

### 操作步骤
1. 识别内容 → 确定指派给谁
2. 先设置 `group_id = null`（转到 Group: --）
3. 再设置 `responder_id`（指派 Agent）

### 执行窗口
- 定时任务每8小时执行，回溯窗口9小时（1小时重叠避免漏筛）
- 已处理的工单（有 triage tag 或 status=5）自动跳过

### 不确定的处理
- 不要自己猜测，先查联系人邮箱和工单内容
- 实在无法判断 → 兜底给 Jennifer Chen
- 重大操作前先发方案给用户确认

---

## 五、回复模板

### 硬件故障
请求：1. 订单号，2. 序列号（棋盘背面），3. 问题照片/视频（<20MB，大文件用 Google Drive）

### 充电/底座问题
请求：App 截图显示各棋子电量状态（iOS/Android 路径）

### 物流延迟
道歉 + 说明缺货原因 + 提供取消退款选项

### 售前咨询
EU 仓库有货、次日发货、1-3天出单号、3-5天送达、30天退货政策

### 产品介绍
Air/Pro/Go = 手动走子 + LED 指示 | Evo = 内置 AI | Move = 自动走子
