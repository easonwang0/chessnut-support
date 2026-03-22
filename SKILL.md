# Chessnut Customer Support SOP & Agent Instructions

This skill defines the autonomous actions for handling incoming Freshdesk support tickets for Chessnut. It runs via automated background cron jobs that execute local Node.js scripts (`triage.js` and `sentinel.js`).

## 1. Intent Detection & Routing (Optimized)
- **Action**: Analyze incoming tickets to determine the true user intent before assigning or drafting.
- **Categorization & Routing Rules**:
  - **Lena Wang (Logistics & Order Manager)**: Assign tickets related to "Shipping date", "My order", "address change", "discount code", "Order Price Adjustment", and logistics tracking.
  - **Gwen Liu (Hardware & Tech Support)**: Assign tickets specifically regarding "Chessnut Move" usage, defective pieces, base replacements, firmware updates, and all website/product reviews.
  - **Jennifer Chen/Jony He (Platform & General)**: Assign platform disputes (PayPal cases, Payoneer cases), general pre-sales inquiries, and specific Chessnut GO support tickets.
- **Spam & System Notifications**:
  - **Criteria**: "Notification of payment received", "Amazon hat Ihre", "has authorized a payment to you", "parcel is on its way", "your advertisement has been approved", and generic marketing/spam.
  - **Execution**: Close the ticket immediately without responding (status: 5). Apply tag `auto-spam-closed`.

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

## Dependencies (To implement)
- An active `FRESHDESK_API_KEY` and domain configuration.
- An active `17TRACK_API_KEY`.
- Backend scripts (`triage.js`, `sentinel.js`) running with Cron jobs configuration setup.
