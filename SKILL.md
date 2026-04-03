# Chessnut Customer Support SOP & Agent Instructions

This skill defines the autonomous actions for handling incoming Freshdesk support tickets for Chessnut. It runs via automated background cron jobs that execute local Node.js scripts (`triage.js` and `sentinel.js`).

## 1. Intent Detection & Routing (Optimized)
- **Action**: Analyze incoming tickets to determine the true user intent before assigning or drafting.
- **Categorization & Routing Rules**:
  - **Lena Wang (Logistics & Order Manager)**: Assign tickets related to "Shipping date", "My order", "address change", "discount code", "Order Price Adjustment", and logistics tracking.
  - **Gwen Liu (Hardware & Tech Support)**: Assign tickets specifically regarding "Chessnut Move" usage, defective pieces, base replacements, firmware updates, and all website/product reviews.
  - **Jennifer Chen/Jony He (Platform & General)**: Assign platform disputes (PayPal cases, Payoneer cases), general pre-sales inquiries, and specific Chessnut GO support tickets.
- **Spam & System Notifications**:
  - **Sender-based filtering (Layer 1a)**: Auto-close tickets from known notification senders before any content analysis:
    - Shopify: `@mailer.shopify.com`, `@shopify.com` (noreply)
    - Amazon: `@marketplace.amazon.*`, `@sellernotifications.*`, `@bounce.amazon`, `@amazon.*` (noreply, all country TLDs)
    - AliExpress: `@aliexpress.com` (noreply/seller), `@service.aliexpress`, `@selleroperation.*`
    - Facebook/Meta: `@facebookmail.com`, `@business.facebook.com`, `@meta.com` (noreply)
    - Mailchimp: `@mailchimp.com`, `@mandrillapp.com`
    - Fuuffy: `@fuuffy.com`
    - PPL: `@pplcz.com`, `@ppl-pk.com`
    - Impact: `@impact.com`
    - PayPal: `@paypal.com` (noreply/service, not dispute-related)
    - TikTok: `@tiktok.com`, `@business.tiktok`
    - Generic: any `@noreply.*`, `@no-reply.*`, `@mailer.*`, `@notifications.*`, `@system.*`, `@bounce.*`
  - **Content-based filtering (Layer 1b)**: Close tickets matching notification content patterns:
    - Amazon multi-language: German (Amazon hat Ihre/Ihre Auszahlung), Italian (La tua e-mail/Pagamento elaborato), Spanish (Valida tu dirección/Reembolso iniciado/Tu pago), French (Votre paiement), Finnish (Pakollinen tilin)
    - AliExpress: 违背发货承诺, 卖家未发货订单关闭, 订单已通过风控审核
    - Fuuffy: 運單派送延誤, 運單差價追收
    - PayPal: "Notification of payment received", "has authorized a payment", "Here's a case update"
    - Mailchimp: "Audience Export Complete", "Mailchimp Order"
    - Facebook/Meta: 广告审核通过, "Your Facebook video cannot be displayed"
    - Music copyright alerts (UMPG)
    - Ads/spam: "Our Solopreneur Sale", "跨境销售", "Partner has been deactivated"
    - Impact: "Public Terms Application", "Product Catalog Submission"
    - Reviews: "left a X star review for"
    - TikTok: verification codes
  - **Execution**: Close the ticket immediately without responding (status: 5). Apply tag `auto-spam-closed` (sender-based gets `sender-based` tag too).

## 2. Technical Troubleshooting & Auto-Drafting (Optimized)
- **CRITICAL RULE**: Do NOT use generic troubleshooting templates unless the specific product and issue are confirmed. Always ask for evidence first if it's a hardware/defect claim.
- **Drafting Rules based on Intent**:
  - **Hardware Defect / Recognition Issue (Move/GO)**: 
    - *Draft*: Apologize. Request: 1. Order Number, 2. Product Serial Number (behind board), 3. A detailed photo/video of the issue (mentioning 20MB limit or suggesting Google Drive). Do NOT suggest cleaning the board or recalibration unless it's a confirmed software glitch without physical damage.
  - **Move Base / Charging Issue**: 
    - *Draft*: Request screenshots of piece battery status in the App (iOS/Android path instructions) before suggesting replacements. Do NOT blindly suggest the 5V/2A charger.
  - **Shipping Delay / Out of Stock (Move Wooden Pieces)**:
    - *Draft*: Apologize for delay due to restocking (expected end of March). Offer to keep the order or cancel for a refund.
- **Execution**: Write the full email draft as a **Private Note** in Freshdesk on the ticket.
- **Tagging**: Apply tag `ai-draft-ready` for human review.

## 3. Logistics Tracking (The 17Track workflow)
- **Triage Action**: When a user asks "Where is my package?" or "Shipping update" and a tracking number is detected, save the number to a local queue (`pending_tracking.json`), and apply tag `logistics-pending`.
- **Workflow (Sentinel)**:
  - The cron job polls against the 17Track API for updates.
  - **Update Found**: If the tracking has new movement, post a **Private Note** with the latest event, apply tag `ai-logistics-update`.
  - **24-Hour Timeout**: If 24 hours pass with NO update, draft a full **Pacification Email** as a Private Note, apply tag `ai-pacification-draft`.

## 4. Filtering Tags Summary for Agents
Agents should use the following tags in Freshdesk to quickly filter and process AI-assisted tickets:
- `ai-draft-ready`: AI drafted a context-aware response based on intent.
- `ai-logistics-update`: Logistics ticket. The package has moved.
- `ai-pacification-draft`: Logistics ticket (>24h with no movement).

## Critical Rules (Learned from 2026-04-03)

### Agent ID Mapping (VERIFIED against API)
- **Gwen Liu**: 150033754311
- **Lena Wang**: 150073233500
- **Jennifer Chen**: 150023804601
- **Jony He**: 150022830364

### Group Filtering
- **ONLY process**: Group: Customer Support (150000248275) and Group: -- (null)
- **NEVER touch**: Kyle Wang, Minmin Hong, Stella Liu, Basilia Wang — belong to Chessnut Official (150018815546)
- When assigning: set group_id=null AND responder_id

### Reply Handling Rule
- Customer replying to a Chessnut email ("Re: Message from Chessnut", "Re: A shipment from order...", etc.) → assign to the agent who sent the original email (typically Jennifer Chen)
- Do NOT reclassify by content if it's a reply to an agent's email

### Sender Filtering
- ticket.requester_email is often undefined — must fetch via contacts API: /contacts/{requester_id}
- @mailer.shopify.com → auto-close
- donotreply@amazon.com → auto-close
- no-reply@mailsupport.aliyun.com → do NOT close, assign to Jennifer (bounce)
- noreply@facebookmail.com → auto-close

### Fallback
- Uncertain tickets → Jennifer Chen

## Dependencies (To implement)
- An active `FRESHDESK_API_KEY` and domain configuration.
- An active `17TRACK_API_KEY`.
- Backend scripts (`triage.js`, `sentinel.js`) running with Cron jobs configuration setup.
