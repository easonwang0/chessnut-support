# Chessnut Freshdesk 工单分诊规则

> 最后更新: 2026-04-05 | 基于 29 条错误指派数据修正
> 准确率验证: 26/28 = 93%（在错误指派数据集上）

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
| Gwen Liu | 150033754311 | EVO、Move 硬件和软件问题 |
| Lena Wang | 150073233500 | 订单、物流、发货、取消、地址修改、发票、售前咨询、产品介绍 |
| Jennifer Chen | 150023804601 | Air/Pro/Go 硬件和软件问题、退信通知 |
| Jony He | 150022830364 | PayPal/Payoneer 争议、品牌合作、KOL、媒体请求、评价通知 |

---

## 三、分诊流程（漏斗模型）

### 第1层：发件人过滤 → 自动关闭

只看发件人地址，匹配到就直接关闭，不需要读内容。

**自动关闭名单：**

| 发件人模式 | 说明 |
|-----------|------|
| `@mailer.shopify.com` / `@shopifyemail.com` | Shopify 通知 |
| `donotreply@amazon.com` / `@amazon.*` noreply | Amazon 通知 |
| `@marketplace.amazon.*` / `@sellernotifications.*` | Amazon 卖家通知 |
| `fba-noreply@amazon.com` | Amazon FBA |
| `@facebookmail.com` / `@business-updates.facebook.com` | Facebook 通知 |
| `@mail.instagram.com` / `@instagram.com` noreply | Instagram 通知 |
| `@mailchimp.com` / `@mandrillapp.com` | 邮件营销 |
| `@fuuffy.com` | Fuuffy 物流 |
| `@impact.com` / `notifications@app.impact.com` | Impact 联盟 |
| `@paypal.com` (noreply/service) | PayPal 通知（非争议） |
| `@pplcz.com` / `@ppl-pk.com` | PPL 物流 |
| `@tiktok.com` / `@business.tiktok` | TikTok 通知 |
| `@aliexpress.com` (noreply/seller) | 速卖通通知 |
| `@kickstarter.com` (noreply) | Kickstarter 通知 |
| `@noreply.*` / `@no-reply.*` / `@donotreply.*` | 通用 noreply |
| `@mailer.*` / `@notifications.*` / `@bounce.*` | 通用通知 |

**例外（不关闭）：**
- `no-reply@mailsupport.aliyun.com` → 转 Jennifer（退信通知）
- 不确定发件人 → 跳过，进入第2层

**操作：** status=5, group_id=null, tags 加 `auto-spam-closed`

---

### 第2层：内容意图识别 → 指派 Agent

⚠️ **核心原则：读邮件全文，理解客户真正的意图，不要用关键词匹配。**

读取工单的 `subject` + `description`（全文），判断客户来信的真实原因。

#### 分诊优先级（从高到低）

**意图 A：平台争议/纠纷 → Jony He**
- PayPal Case（PP-R-xxx 格式）
- Payoneer 争议/chargeback
- 速卖通纠纷

**意图 B：品牌合作/KOL/媒体/评价 → Jony He**
- YouTube / TikTok / 社交媒体博主寻求合作
- 寻求赞助（sponsorship）
- 媒体采访 / 媒体评测请求
- affiliate / 推广合作
- ⭐ **评价通知（"left a X star review"）→ Jony**（用于品牌口碑追踪）

**意图 C：产品硬件/软件故障 → Gwen Liu 或 Jennifer Chen**

客户在报告产品使用中的问题，需要技术支持。

**关键：识别产品型号。** 阅读邮件全文，查找：
- 明确提到产品名（EVO, Move, Air, Pro, Go）
- 描述了产品特征（自动走棋 = Move，内置屏幕/AI = EVO，轻薄便携 = Go/Air）
- 附带了序列号（CE 开头通常是 EVO）

| 产品 | 指派 |
|------|------|
| Move（自动走棋机器人） | **Gwen Liu** |
| EVO（带屏幕的一体机） | **Gwen Liu** |
| Air / Air+ / Pro / Go | **Jennifer Chen** |
| 无法确定型号，但明确是硬件/软件问题 | **Jennifer Chen**（兜底） |

**⚠️ 重要规则：产品缺陷导致的退货/退款 → 指派产品团队，不是 Lena**
- 如果客户说"我要退货"但原因是产品故障 → 产品团队
- 如果客户只是想取消/退款，没有产品问题 → Lena

**意图 D：订单/物流/售前 → Lena Wang**

客户在问关于**购买、订单、发货、退货**的事情（非产品缺陷原因）：
- 查订单状态 / 物流进度 / 追踪号
- 取消订单 / 修改地址 / 修改订单内容
- 催发货 / 问发货时间
- 退换货 / 退款（非产品缺陷原因）
- 开发票 / 收据
- 缺货咨询 / 预购
- 产品价格 / 运费 / 退货政策（售前）
- 产品功能介绍 / 产品对比 / 选购建议
- 批发 / 代理合作（售前商务）
- 客户回复 Lena 发出的邮件

**意图 E：系统通知/垃圾邮件 → 关闭**

邮件内容是自动通知，不需要人工回复：
- 支付收款通知（"Notification of payment received"）
- 广告审核通知（"你的广告已通过审核"）
- 版权/知识产权通知
- Facebook 视频/帖子移除通知
- Amazon 平台政策通知（燃油费、EPR 等）
- FBA 通知
- 广告/推广/SEO 垃圾邮件
- Kickstarter 消息

**⚠️ 不要自动关闭的：**
- 评价通知 → 给 Jony（意图 B）
- 真实客户发来的邮件（即使看起来像通知）→ 仔细判断
- Shopify/Amazon 的业务政策变更通知 → 留给人工判断（可能影响运营）

**意图 F：兜底 → Jennifer Chen**

只有在以上意图都无法判断时，才指派给 Jennifer。

---

### 第3层：起草回复（Private Note）

**⚠️ 核心：理解来信内容，不要盲目套模板。** 每封邮件的背景不同，回复要针对具体情况。

**流程：**
1. 读取工单全文 + 对话历史
2. 理解客户的核心诉求和情绪
3. 结合知识库（FAQ、产品信息、政策）起草回复
4. 考虑客户的具体情况（订单状态、产品型号、地理位置等）
5. 发布为 **Private Note**（不自动发送，留人工审核）
6. 加 tag `ai-draft-ready`

**起草原则：**
- 先回应客户的关切，再给方案
- 如果需要更多信息（订单号、序列号、视频），明确提出
- 不要假设客户知道技术细节——给出具体操作步骤
- 金额、时间承诺要保守——宁可少说不可多说
- 不确定的事项标注 [需确认] 留给 Agent 判断

---

### 第4层：回复处理（特殊规则）

**客户回复 Chessnut 发出的邮件** → 查看对话历史，指派给发起对话的 Agent。

判断标准：
- 主题含 "Re: Message from Chessnut"、"Re: A shipment from order..." 等
- 查看 conversation 或 notes，找到原始发件人
- 指派给该 Agent，不要按回复内容重新分类

---

## 四、操作步骤

1. **过滤发件人**（第1层） → 匹配就关闭，不匹配继续
2. **读取工单全文** → subject + description + conversation history
3. **判断意图** → 按 A/B/C/D/E/F 分类（按优先级从高到低匹配）
4. **执行操作：**
   - 关闭：`status=5`, `tags=["auto-spam-closed"]`
   - 指派：`group_id=null`, `responder_id=<agent_id>`, `tags=["<category-tag>"]`

### Tag 命名规范
- `auto-spam-closed` — 自动关闭
- `2-dispute-jony` — 争议类
- `3-product-gwen` — EVO/Move 产品问题
- `3-product-jennifer` — Air/Pro/Go 产品问题
- `4-order-lena` — 订单/物流/售前
- `5-kol-jony` — KOL/合作/媒体/评价
- `5-fallback-jennifer` — 兜底

### 执行窗口
- 定时任务每8小时执行，回溯窗口9小时（1小时重叠避免漏筛）
- 已处理的工单（有上述任何 tag 或 status=5）自动跳过

---

## 五、发件人获取

- `ticket.requester_email` 在 Freshdesk 列表 API 里经常为空
- 必须通过 `requester_id` → `/contacts/{id}` 获取真实邮箱
- 获取后缓存，避免重复请求

---

## 六、回复模板

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
