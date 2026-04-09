const fs = require('fs');
const pending = require('./pending_tickets.json');

// Auto-inherit ALL toClose from fetch_tickets.js spam detection
const toClose = pending.toClose.map(t => ({ id: t.id, reason: t.reason }));
const assignments = [];

function add(id, assignee, stage, reason, draftReply) {
  const entry = { id, assignee, stage, reason };
  if (draftReply) entry.draft_reply = draftReply;
  assignments.push(entry);
}

// ===== ORDER STATUS / LOGISTICS → LENA =====
const orderStatusDraft = `Hi,

Thank you for reaching out to us.

We sincerely apologize for the delay. Your order is currently being processed and we are working to get it shipped as soon as possible.

If you could kindly confirm your order number, we will check the latest status and provide you with an update right away.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`;

const orderUrgentDraft = `Hi,

We sincerely apologize for the delay in shipping your order. We understand how frustrating this must be.

Your order is currently being processed. Due to high demand for the Chessnut Move, there has been a delay in our restocking schedule. We are working to fulfill your order as quickly as possible.

If you would prefer not to wait, we completely understand and can arrange a full refund for you. Please let us know how you would like to proceed.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`;

// #108777 - Order #39108 status
add(108777, 'LENA', '3-order-lena', 'Order status inquiry #39108', orderStatusDraft);

// #108758 - Order status #39320 Move
add(108758, 'LENA', '3-order-lena', 'Order status inquiry #39320 (Move)', orderStatusDraft);

// #108751 - Order #41037 confirmation
add(108751, 'LENA', '3-order-lena', 'Order confirmation inquiry #41037', orderStatusDraft);

// #108766 - My ORDER (waiting >1 week, wants cancel)
add(108766, 'LENA', '3-order-lena', 'Order not received, wants cancel if not shipping', orderUrgentDraft);

// #108764 - where's my order (no response)
add(108764, 'LENA', '3-order-lena', 'Order not received, frustrated, wants cancel', orderUrgentDraft);

// #108762 - Order #40511, 2nd email, upset about Shopify involvement
add(108762, 'LENA', '3-order-lena', 'Order #40511 overdue, frustrated customer (2nd email)', `Hi Jon,

We sincerely apologize for the delay and for not responding to your first email promptly. We understand your frustration.

Regarding your order #40511: Chessnut uses Shopify as our e-commerce platform to process orders — your purchase is directly with Chessnut, and we are responsible for fulfilling it. We apologize for any confusion.

Your order is currently being processed. Due to high demand, there has been a delay in shipping. We are working to get your order out as quickly as possible.

If you would prefer a refund instead, we completely understand and can arrange that for you immediately.

Please let us know how you would like to proceed, and we will take care of it right away.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108733 - Order update 39544
add(108733, 'LENA', '3-order-lena', 'Order status inquiry #39544', orderStatusDraft);

// #108726 - Haven't received order, wants refund
add(108726, 'LENA', '3-order-lena', 'Order not received, demands refund', orderUrgentDraft);

// #108724 - Haven't received my order, wants refund
add(108724, 'LENA', '3-order-lena', 'Order not received, demands refund (duplicate)', orderUrgentDraft);

// #108722 - Address change #40781
add(108722, 'LENA', '3-order-lena', 'Address change request #40781 or cancel', `Hi Elizaveta,

Thank you for reaching out.

We have received your request to change the delivery address for order #40781. We will update the address to:

1707 Village Blvd, Apt 308
West Palm Beach, FL 33409

We will confirm once the address has been updated. If the order has already shipped, we will work with our logistics partner to redirect it.

If you prefer to cancel instead, please let us know and we will process a full refund.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108719 - Shipment inquiry (Move)
add(108719, 'LENA', '3-order-lena', 'Move order shipping timeline inquiry', orderUrgentDraft);

// #108688 - Order #40149 status
add(108688, 'LENA', '3-order-lena', 'Order status inquiry #40149', orderStatusDraft);

// #108685 - Order 39008 (Feb order, nearly 2 months)
add(108685, 'LENA', '3-order-lena', 'Order #39008 delayed since February', orderUrgentDraft);

// #108674 - Order status update request (no order number)
add(108674, 'LENA', '3-order-lena', 'Order status update request (no order number)', orderStatusDraft);

// #108672 - Order #40511 status (same order as 108762)
add(108672, 'LENA', '3-order-lena', 'Order #40511 status inquiry (duplicate)', `Hi Jon,

Thank you for reaching out. We apologize for the delay.

We are looking into the status of order #40511 and will provide you with an update as soon as possible.

Regarding Shopify — Chessnut uses Shopify as our e-commerce platform, but your purchase is directly with us. We apologize for any confusion this may have caused.

We appreciate your patience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108671 - Return for refund (carrying case)
add(108671, 'LENA', '3-order-lena', 'Return/refund request for Move carrying case', `Hi,

Thank you for reaching out.

We're sorry to hear you'd like to return your Chessnut Move carrying case. We can certainly help with that.

To initiate the return process, please provide us with your order number. Once we verify the details, we will send you a prepaid return label and process your refund upon receipt of the item.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108709 - Cancel order 40202 (carrying case)
add(108709, 'LENA', '3-order-lena', 'Cancel order #40202 (Move carrying case)', `Hi,

Thank you for letting us know.

We have received your request to cancel order #40202 for the Chessnut Move carrying case. We will process the cancellation and issue a full refund. You should see the refund reflected in your account within 5-10 business days.

We apologize for any inconvenience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== ADDRESS CORRECTIONS → LENA =====

// #108754 - EVO order address error (Bowmanville → Oshawa)
add(108754, 'LENA', '3-order-lena', 'Address correction for EVO order (Bowmanville → Oshawa)', `Hi Jim,

Thank you for reaching out promptly.

We have received your address correction request. We will update the shipping address to:

James White
830 Beatrice St East
Oshawa, Ontario
Canada L1K 2H7

We will confirm once the address has been updated in our system. Since you caught this early, we should be able to make the change before shipment.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108736 - Address correction
add(108736, 'LENA', '3-order-lena', 'Address correction request', `Hi,

Thank you for reaching out.

We have received your request to correct the shipping address. We will update it to:

804 Walnut St, Oolitic, Indiana

Could you please confirm your order number so we can make sure the change is applied to the correct order?

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108679 - Address too long (>35 chars)
add(108679, 'LENA', '3-order-lena', 'Address exceeds 35-char limit, needs shortening', `Hi,

Thank you for your reply.

We need to shorten the recipient address to meet our logistics partner's requirements. Could you please provide a shorter version of the address? For example:

4297 Express Lane, Sarasota, FL 34249

Could be shortened to something like:
4297 Express Ln, FL 34249

Please let us know your preferred shortened address and we will proceed with the shipment immediately.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== EXTRA SHIPPING FEE REPLIES → LENA =====

// #108748 - Robin asking about delivery timeline after agreeing to pay extra
add(108748, 'LENA', '3-order-lena', 'Follow-up on extra shipping fee — delivery timeline', `Hi Robin,

Thank you for confirming.

Now that we have received your confirmation to cover the additional shipping fee, we will proceed with shipping your order immediately. You can expect your order to be dispatched within 1-2 business days, and we will send you the tracking information once it ships.

Delivery typically takes 7-14 business days depending on your location.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108715 - Nina confirms extra shipping
add(108715, 'LENA', '3-order-lena', 'Customer confirmed extra shipping fee', `Hi Nina,

Thank you for confirming. We really appreciate your understanding.

We will proceed with shipping your order right away. You will receive a tracking number via email once the shipment is on its way.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108686 - "Yes, please proceed" (extra shipping)
add(108686, 'LENA', '3-order-lena', 'Customer confirmed extra shipping fee', `Hi,

Thank you for confirming. We will proceed with your order right away.

You will receive a tracking number via email once your order has been shipped.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== EORI/VAT → LENA =====

// #108697 - Joël providing ID number for customs
add(108697, 'LENA', '3-order-lena', 'Customer provided ID number for customs (Switzerland)', `Hi Joël,

Thank you for providing your ID number. We have noted the following for customs purposes:

ID Number: C8485912

We confirm that this information will be used solely for shipping and customs clearance and will only be shared with our relevant logistics and customs partners.

We will proceed with processing your shipment and will notify you once it is on its way.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== RETURN → LENA =====

// #108694 - Return request (order #40233, wants to buy Move instead)
add(108694, 'LENA', '3-order-lena', 'Return request #40233, wants to buy Move instead', `Hi Patti,

Thank you for reaching out.

We can certainly help you with returning your current order (#40233) so you can purchase the Chessnut Move instead.

To initiate the return, could you please confirm:
1. The item is in its original packaging and unused
2. Your current shipping address (for the return label)

Once we have this information, we will send you a prepaid return label. Upon receipt of the returned item, we will process your refund within 5-10 business days.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== DHL SHIPPING ISSUE → LENA =====

// #108681 - DHL extension request for order #39434
add(108681, 'LENA', '3-order-lena', 'DHL delivery issue for order #39434, needs address redirect', `Hi,

Thank you for following up on order #39434.

We are checking with DHL regarding the two-day extension request for the delivery. We will update you as soon as we hear back.

If the extension is not approved, we will work with DHL to redirect the shipment to an alternative address. Please have the new recipient name and address ready so we can act quickly if needed.

We will be in touch shortly with an update.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== MISSING PARCEL → LENA =====

// #108775 - UPS marked delivered but not received
add(108775, 'LENA', '3-order-lena', 'Missing parcel — UPS says delivered but customer has nothing', `Hi,

We're sorry to hear that you haven't received your package. Let us help you look into this.

Could you please provide us with:
1. Your order number
2. The shipping address on the order

In the meantime, we recommend:
- Checking with neighbors or anyone else at the delivery address
- Looking around the delivery area (side doors, porches, mailrooms)
- Checking with your local UPS office

Once we have your order details, we will file a trace request with UPS and work to resolve this as quickly as possible.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PRODUCT INQUIRIES → GWEN (EVO/Move) =====

// #108743 + #108740 + #108741 - George Hild: EVO + Go, app issues
// Merge into one — use the most recent/detailed ticket
add(108740, 'GWEN', '3-product-gwen', 'EVO app connection issue + forgot ID/password', `Hi,

Thank you for reaching out, and congratulations on your new Chessnut EVO!

To get your EVO connected to the Chessnut app, please follow these steps:

1. Open the Chessnut app on your iPad
2. If you're logged into your old account, go to Settings → Log Out
3. If you forgot your password, tap "Forgot Password" on the login screen and enter your email to reset it
4. Once logged in, tap the "+" button to add a new device
5. Select "Chessnut EVO" and follow the on-screen pairing instructions

If you're still having trouble connecting, please make sure:
- Your iPad's Bluetooth is turned on
- The EVO is powered on and within range
- The Chessnut app is updated to the latest version

If you continue to experience issues, please let us know and we'll be happy to assist further.

Best,
Gwen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108742 - Same person, iPad message about EVO/Go
// Already covered by 108740

// #108720 - Move motor replacement pieces
add(108720, 'GWEN', '3-product-gwen', 'Move replacement motor pieces request (6 motors)', `Hi,

Thank you for your message, and we're glad to hear you're enjoying your Chessnut Move overall!

We can help you with replacement motors for the plastic piece set. We currently offer replacement motors — please let us know which specific pieces you need (you mentioned 3 white and 3 black), and we will arrange the order for you.

Regarding the software bug you mentioned (moves resetting after being made) — this has been addressed in recent firmware updates. Please make sure your Chessnut app and Move board firmware are updated to the latest versions. You can update the firmware through the Chessnut app under Settings → Device → Firmware Update.

As for the kings' cross falling off — we apologize for the inconvenience. If you need replacement kings, please let us know and we can include them with your motor order.

Could you also please provide your order number so we can process this efficiently?

Best,
Gwen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PRODUCT INQUIRIES → JENNIFER (Air/Pro/Go & fallback) =====

// #108755 - David Greaver: How to buy replacement pieces for Go
add(108755, 'JENNIFER', '3-product-jennifer', 'How to buy replacement pieces for Chessnut Go', `Hi David,

Thank you for reaching out!

Replacement pieces for the Chessnut Go are available. You can order them directly from our website at https://www.chessnutech.com, or if you let us know which specific pieces you need, we can help you place the order.

Could you also please share your order number so we can verify your purchase and assist you more efficiently?

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108752 - Mike Stav: Manual/standalone use without phone
add(108752, 'JENNIFER', '3-product-jennifer', 'Can Go work without smartphone/Bluetooth?', `Hi Mike,

Thank you for your great question!

The Chessnut Go does require a smartphone or tablet with Bluetooth to access most of its features, including playing against the built-in AI and setting up chess problems. The board itself does not have a standalone screen or interface — it connects to the Chessnut app to provide the full experience.

Here's what you can do with the app:
- Play against adaptive AI at various difficulty levels
- Set up and solve chess puzzles
- Play online on platforms like Chess.com and Lichess
- Analyze your games

You can find the full user manual in the Chessnut app under Settings → Help, or on our website at https://www.chessnutech.com/support.

If you don't have a smartphone, you can also use a tablet (iPad or Android tablet) with the Chessnut app.

Please let us know if you have any other questions!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108714 - Chessnut Go Bluetooth connection issue
add(108714, 'JENNIFER', '3-product-jennifer', 'Chessnut Go Bluetooth pairing issue', `Hi,

Thank you for reaching out, and sorry for the trouble with connecting your Chessnut Go.

The issue you're describing (board appears briefly then disappears) is a known pairing issue that can usually be resolved with these steps:

1. Forget the device: Go to your phone's Bluetooth settings, find "Chessnut Go" in the paired devices list, and tap "Forget This Device"
2. Restart the board: Turn off the Chessnut Go, wait 10 seconds, then turn it back on
3. Restart Bluetooth: Turn Bluetooth off on your phone, wait 5 seconds, then turn it back on
4. Re-open the app: Close the Chessnut app completely (swipe it away from recent apps), then re-open it
5. Pair through the app: In the Chessnut app, tap "+" to add a device and follow the pairing prompts — do NOT pair from your phone's Bluetooth settings directly

If the issue persists after these steps, please let us know:
- Your phone model and OS version
- The version of the Chessnut app you're using (found in Settings → About)

We'll be happy to assist further.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108675 - Go black king missing magnet
add(108675, 'JENNIFER', '3-product-jennifer', 'Chessnut Go black king missing magnet (defect)', `Hi Hannah,

Thank you for reaching out, and we're sorry to hear about the issue with the black king piece.

We'd be happy to send you a replacement. Before we process this, could you please provide:
1. Your order number
2. A photo or short video showing the issue (the king sliding off the board)

Once we receive these details, we'll arrange a replacement black king to be sent to you right away.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108676 - Can you play with bot with Chessnut Go?
add(108676, 'JENNIFER', '3-product-jennifer', 'Can you play bot with Chessnut Go?', `Hi Vihaan,

Yes, absolutely! The Chessnut Go supports playing against AI bots through the Chessnut app.

Here's how:
1. Download the Chessnut app (iOS or Android)
2. Connect your Chessnut Go via Bluetooth
3. Select "Play vs AI" mode
4. Choose your preferred difficulty level

The AI adapts to your skill level, making it great for both beginners and experienced players.

Let us know if you have any other questions!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108692 - Do you deliver across Europe?
add(108692, 'JENNIFER', '5-fallback-jennifer', 'Delivery to Europe inquiry', `Hi,

Yes, we do deliver across Europe! We ship to most European countries from our EU warehouse.

You can place your order directly on our website at https://www.chessnutech.com, and shipping costs and estimated delivery times will be calculated at checkout based on your location.

If you have any specific questions about delivery to your country, please let us know!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108677 - Move wooden pieces restock ETA
add(108677, 'JENNIFER', '5-fallback-jennifer', 'Chessnut Move (wooden pieces) restock ETA', `Hi Victoria,

Thank you for your pre-order and your patience!

The Chessnut Move with wooden pieces is currently being restocked. We expect to have new inventory available soon and will ship pre-orders as soon as stock arrives.

We will send you an update with tracking information once your order ships. If you have any questions in the meantime, please don't hesitate to reach out.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108703 - Which e-board for first one?
add(108703, 'JENNIFER', '5-fallback-jennifer', 'Product recommendation for first e-board', `Hi Jeffrey,

Great question! Here's a quick overview to help you decide:

**Chessnut Go ($180)** — Best for beginners. Compact, lightweight, great value. Pairs with the Chessnut app for AI play and online chess.

**Chessnut Air ($300-$400)** — Step up with a beautiful wooden board, LED move indicators, and a more premium feel. Great for home use.

**Chessnut Pro ($500-$600)** — Our premium board with tournament-quality pieces, advanced AI features, and a larger playing surface.

**Chessnut Move ($700+)** — Our flagship with motorized pieces that move on their own! The ultimate chess experience.

For a first e-board, we typically recommend the **Chessnut Go** or **Chessnut Air** depending on your budget. Both offer an excellent experience and work with popular platforms like Chess.com and Lichess.

Feel free to ask if you'd like more details on any of these!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108678 - Sumi P: "Hi" (unclear)
add(108678, 'JENNIFER', '5-fallback-jennifer', 'Brief greeting, unclear intent', `Hi,

Thank you for reaching out to Chessnut! How can we help you today?

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108700 - KOL/sponsorship request (junior chess player)
add(108700, 'JENNIFER', '5-kol-jennifer', 'KOL/sponsorship request — junior chess player', `Hi Yuliaty,

Thank you for reaching out and for sharing Yvon's impressive chess achievements! It's wonderful to see young players excelling in the sport.

We appreciate your interest in sponsorship support for the World Youth Championship. This sounds like a fantastic opportunity for Yvon.

We'd like to review this request with our team. Could you please provide:
1. A brief proposal outlining what you're looking for (product sponsorship, financial support, etc.)
2. Any social media or content channels where Yvon shares her chess journey

We'll forward this to the relevant team and get back to you as soon as possible.

Best regards,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108774 - Collaboration: cinematic video (KOL/filmmaker)
add(108774, 'JENNIFER', '5-kol-jennifer', 'KOL collaboration — cinematic product video', `Hi Yuri,

Thank you for reaching out! Your portfolio is impressive, and we love the idea of showcasing our products in a cinematic style.

We'd be interested in discussing this collaboration further. Could you please share:
1. Your rates for a product video (60-90 seconds)
2. Your typical turnaround time
3. Any examples of similar product videos you've created for tech/consumer brands

We'll review this with our marketing team and get back to you shortly.

Best regards,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108682 - Bulk order 500 Move to Kazakhstan
add(108682, 'JENNIFER', '5-fallback-jennifer', 'Bulk order inquiry — 500 Chessnut Move to Kazakhstan', `Hi,

Thank you for your interest in ordering Chessnut Move boards in bulk!

For large orders like this, we'd like to connect you with our sales team who can provide:
- Volume pricing and discounts
- Shipping logistics for delivery to Kazakhstan
- Payment terms and invoicing options

Could you please provide:
1. Your company name and contact details
2. Your preferred timeline for delivery
3. Any specific customization requirements

We'll have our sales team reach out to you directly to discuss the details.

Best regards,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== REPLY TO AGENT → JENNIFER =====

// #108737 - Shahaf: "I don't see any change, it's been a month, ceasefire is over, ship ASAP"
add(108737, 'JENNIFER', '5-fallback-jennifer', 'Customer frustrated — order from March 10, airspace excuse invalid', `Hi Shahaf,

Thank you for your message, and we sincerely apologize for the continued delay.

We understand your frustration — a month is too long to wait. We are prioritizing your order and working to get it shipped immediately. Now that the airspace situation has been resolved, we will arrange shipment right away.

We will send you the tracking information within the next 1-2 business days.

Thank you for your patience, and again, we apologize for the inconvenience.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PAYPAL DISPUTES → JONY =====
const paypalDraft = `Hi,

We have received notification of a PayPal dispute that requires immediate attention. This has been escalated to the appropriate team for handling.

Best,
Jony He
Customer Service Representative, Chessnut
https://chessnutech.com`;

// #108787 - PayPal case PP-R-JQF-621585046 ($838.99)
add(108787, 'JONY', '2-case-jony', 'PayPal dispute — PP-R-JQF-621585046, $838.99', paypalDraft);

// #108786 - Same case escalated to claim
add(108786, 'JONY', '2-case-jony', 'PayPal dispute escalated — PP-R-JQF-621585046', paypalDraft);

// #108785 - Same case, buyer response
add(108785, 'JONY', '2-case-jony', 'PayPal dispute — buyer response PP-R-JQF-621585046', paypalDraft);

// #108778 - Same case, reminder closes April 12
add(108778, 'JONY', '2-case-jony', 'PayPal dispute URGENT — PP-R-JQF-621585046 closes Apr 12', `Hi,

URGENT: We have received a reminder that PayPal dispute PP-R-JQF-621585046 ($838.99) will be automatically closed on April 12, 2026 if not escalated. This requires immediate action.

Please ensure all relevant evidence (shipping confirmation, tracking info, delivery proof) is submitted to the PayPal Resolution Center before the deadline.

Best,
Jony He
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108734 - PayPal case PP-R-CFN-623797962 ($799.00)
add(108734, 'JONY', '2-case-jony', 'PayPal dispute — PP-R-CFN-623797962, $799.00', paypalDraft);

// #108718 - Payoneer dispute (arne.theisen@gmx.net, $679.15)
add(108718, 'JONY', '2-case-jony', 'Payoneer dispute — $679.15, arne.theisen@gmx.net', `Hi,

We have received notification of a Payoneer dispute for transaction roYbJkQw0UAHJh3qzuQ2uR5ko ($679.15) from customer arne.theisen@gmx.net.

Please log into your Payoneer account and navigate to Checkout > Disputes to review and respond with shipping/tracking evidence before the deadline.

Best,
Jony He
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108673 - Grand Philippe: Will Move pieces/batteries be sold separately?
add(108673, 'JENNIFER', '3-product-jennifer', 'Product inquiry — will Move pieces/batteries be sold separately?', `Hi Philippe,

Thank you for reaching out!

Currently, replacement pieces and batteries for the Chessnut Move are not yet available for separate purchase on our website. However, we are working to make them available soon.

If you need replacement parts urgently, please contact us directly with details of what you need, and we will do our best to assist you.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// Manual closes for tickets NOT caught by fetch_tickets.js spam detection
// These are tickets from toAnalyze that need to be closed (duplicates, auto-closed cases, etc.)
// Auto-inherit from pending.toClose handles the rest
const manualCloses = [
  { id: 108710, reason: 'paypal-case-auto-closed' },  // PayPal auto-closed, not spam
  { id: 108743, reason: 'duplicate-of-108740' },       // George Hild duplicate
  { id: 108742, reason: 'duplicate-of-108740' },       // George Hild duplicate
  { id: 108741, reason: 'duplicate-of-108740' },       // George Hild duplicate
];
manualCloses.forEach(c => {
  if (!toClose.find(x => x.id === c.id)) toClose.push(c);
});

const assignIds = new Set(assignments.map(a => a.id));
const filteredClose = toClose.filter(c => !assignIds.has(c.id));

const output = {
  timestamp: new Date().toISOString(),
  toClose: filteredClose,
  assignments
};

fs.writeFileSync(__dirname + '/triage_decisions.json', JSON.stringify(output, null, 2));
console.log('Generated triage_decisions.json');
console.log('  To close:', filteredClose.length, '(from pending:', pending.toClose.length, '+ manual:', manualCloses.length, ')');
console.log('  Assignments with draft:', assignments.filter(a => a.draft_reply).length);
console.log('  Assignments without draft:', assignments.filter(a => !a.draft_reply).length);
