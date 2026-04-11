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

// #108926 - Order 40143, month ago, no update
add(108926, 'LENA', '3-order-lena', 'Order status inquiry #40143 — delayed 1 month', `Hi Jeff,

Thank you for reaching out, and we sincerely apologize for the delay in shipping your order.

Your order #40143 is currently being processed. Due to high demand, there has been a delay in our fulfillment schedule. We are working to get your order shipped as soon as possible.

If you would prefer not to wait, we completely understand and can arrange a full refund for you. Please let us know how you would like to proceed.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108924 - Order #39635, no shipping details yet
add(108924, 'LENA', '3-order-lena', 'Order status inquiry #39635 — no shipping info', `Hi Itumeleng,

Thank you for reaching out, and we sincerely apologize for the delay.

We are looking into the status of your order #39635 and will provide you with an update as soon as possible. Your order is currently being processed and we are working to get it shipped out promptly.

Thank you for your patience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108908 - Update on order #40490
add(108908, 'LENA', '3-order-lena', 'Order status inquiry #40490', `Hi,

Thank you for reaching out.

We sincerely apologize for the delay. Your order #40490 is currently being processed and we are working to get it shipped as soon as possible.

We will send you the tracking information once your order has been dispatched.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108907 - Re: Order #40490 confirmed (same customer as 108908)
add(108907, 'LENA', '3-order-lena', 'Order status inquiry #40490 (reply to confirmation)', `Hi David,

Thank you for following up. We sincerely apologize for the delay.

Your order #40490 is currently being processed and we are working to get it shipped out as quickly as possible. We will send you the tracking information once it is dispatched.

Thank you for your patience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108911 - Reply to delay notification (Middle East airspace), just says "Thank you"
add(108911, 'JENNIFER', '5-fallback-jennifer', 'Customer acknowledged delay notification — no action needed', `Hi,

Thank you for your understanding. We will keep you updated on the status of your order and notify you as soon as it ships.

If you have any questions in the meantime, please don't hesitate to reach out.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108901 - Reply about Middle East ceasefire, wants shipping info
add(108901, 'LENA', '3-order-lena', 'Customer asking for shipping update — Middle East order', `Hi,

Thank you for the update and for your patience.

We are monitoring the situation closely and will arrange shipment for your order as soon as logistics operations are fully restored in the region. We will send you tracking information as soon as your order ships.

If you have any questions or need further assistance, please let us know.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108897 - Order #41873, wants to speed up delivery
add(108897, 'LENA', '3-order-lena', 'Order #41873 — customer wants expedited shipping', `Hi Eilidh,

Thank you for your order and for reaching out!

Your order #41873 is being processed and will be shipped as soon as possible. Unfortunately, we do not currently offer an expedited shipping option, but we are working to dispatch all orders promptly.

We will send you the tracking information once your order has been shipped.

Thank you for your patience!

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108870 - Order #41378, when will it dispatch
add(108870, 'LENA', '3-order-lena', 'Order status inquiry #41378 — dispatch timeline', `Hi Chris,

Thank you for reaching out, and we apologize for the delay.

Your order #41378 is currently being processed. We are working to fulfill orders as quickly as possible and will send you the tracking information once your order has been dispatched.

Thank you for your patience and understanding.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108869 - Order #39689 — 39 days, wants update or refund
add(108869, 'LENA', '3-order-lena', 'Order #39689 — 39 days delayed, wants update or refund', `Hi Harry,

We sincerely apologize for the delay in shipping your order #39689. We understand how frustrating this must be, especially after 39 days.

Your order is currently being processed. Due to high demand, there has been a delay in our fulfillment schedule. We are working to get it shipped as soon as possible.

If you would prefer a full refund instead of continuing to wait, we completely understand and can arrange that for you immediately.

Please let us know how you would like to proceed.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108864 - Order #40752, delivery status
add(108864, 'LENA', '3-order-lena', 'Order status inquiry #40752 — delivery timeline', `Hi Alexander,

Thank you for reaching out, and we sincerely apologize for the delay.

We are checking on the status of order #40752 and will provide you with an update as soon as possible. Your order is currently being processed and we are working to fulfill it promptly.

Thank you for your patience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== ADDRESS CORRECTION → LENA =====

// #108933 - Address correction for order #41808
add(108933, 'LENA', '3-order-lena', 'Address correction request for order #41808', `Hi Yevheniia,

Thank you for reaching out promptly.

We have received your request to correct the delivery address for order #41808. Could you please provide the new correct shipping address so we can update it in our system?

Once we have the updated address, we will confirm the change and ensure your order is delivered to the correct location.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108923 - Reply about PO Box / DPO AA address (embassy)
add(108923, 'LENA', '3-order-lena', 'Embassy address — DPO AA format clarification', `Hi Alejandro,

Thank you for the detailed explanation, and we truly appreciate your patience.

We understand the DPO AA address format used by U.S. Embassy personnel. Let us review this with our logistics partner to determine if we can ship to this type of address. DPO addresses are handled through USPS, which may require special arrangements on our end.

We will get back to you as soon as possible with a definitive answer. In the meantime, if you have an alternative physical address available, that would help us expedite the shipment.

Thank you for your understanding, and we hope to get your Chessnut board to you soon!

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108851 - Provide new physical address (was PO Box)
add(108851, 'LENA', '3-order-lena', 'Customer provided physical address (was PO Box)', `Hi Glenn,

Thank you for providing the updated address. We have received it and will update your order with:

Glenn Ingham
20 Seekamp Street
DENMAN PROSPECT ACT 2611
AUSTRALIA

We will confirm once the address has been updated in our system and proceed with shipping.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== EXTRA SHIPPING FEE REPLIES → LENA =====

// #108915 - "Sure but do I have to wait longer?" (extra shipping $144.85)
add(108915, 'LENA', '3-order-lena', 'Customer confirmed extra shipping fee — asking about timeline', `Hi Martin,

Thank you for confirming your willingness to cover the additional shipping fee.

We will proceed with shipping your order immediately. You can expect your order to be dispatched within 1-2 business days, and we will send you the tracking information once it ships.

You should not have to wait much longer — we will prioritize your order right away.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108892 - Confirms extra shipping + asks about refund offset ($97.75 vs $32.31 refund)
add(108892, 'LENA', '3-order-lena', 'Customer confirmed extra shipping + asking about refund offset', `Hi Kushal,

Thank you for confirming. We really appreciate your understanding.

Regarding the previously agreed refund of US$32.31 — let us verify the status of that refund with our team. If it has not yet been processed, we will adjust your additional shipping charge to the net amount of US$65.44 and proceed with shipping immediately.

We will confirm the final amount and ship your order as soon as this is sorted out.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108850 - Confirms extra shipping ($110.39) + address change
add(108850, 'LENA', '3-order-lena', 'Customer confirmed extra shipping + address change', `Hi Bridget,

Thank you for confirming your willingness to cover the additional shipping fee. We really appreciate your understanding.

We have also noted your updated delivery address:

Bridget Kyoheirwe
Apartment 2803
Charrington Tower
11 Biscayne Avenue
London, United Kingdom, E14 9BF

We will update both the shipping fee and the delivery address in our system and proceed with shipping your order immediately. You will receive a tracking number once your order is dispatched.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== CANCELLATION REQUESTS → LENA =====

// #108889 - Wants full refund (extra shipping $128.48)
add(108889, 'LENA', '3-order-lena', 'Customer wants full refund — refused extra shipping fee', `Hi Ethan,

Thank you for letting us know.

We have received your request for a full refund. We will process the cancellation of your order and issue a full refund to your original payment method. You should see the refund reflected in your account within 5-10 business days.

We sincerely apologize for the inconvenience and hope to serve you again in the future.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108885 - Cancel order (refuses extra shipping)
add(108885, 'LENA', '3-order-lena', 'Customer wants to cancel — refused extra shipping fee', `Hi Chantal,

Thank you for letting us know.

We have received your request to cancel your order. We will process the cancellation and issue a full refund to your original payment method. The refund should appear in your account within 5-10 business days.

We sincerely apologize for any inconvenience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108880 - Cancel order (no import permit for Thailand)
add(108880, 'LENA', '3-order-lena', 'Customer wants to cancel — no Thailand import permit', `Hi Natthakiat,

Thank you for your response.

We understand and will proceed with cancelling your order right away. We will issue a full refund to your original payment method. You should see the refund reflected in your account within 5-10 business days.

We sincerely apologize that we were unable to fulfill your order and hope to serve you in the future.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108862 - Cancellation request order 41570
add(108862, 'LENA', '3-order-lena', 'Cancellation request order #41570 — wants full refund', `Hi Ori,

Thank you for reaching out.

We have received your request to cancel order #41570. We will process the cancellation and issue a full refund of $753.15 USD to your original payment method. The refund should appear in your account within 5-10 business days.

We will confirm once the cancellation has been completed.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108848 - Refund request order #38782 — 3 months, out of stock
add(108848, 'LENA', '3-order-lena', 'Refund request order #38782 — 3 months delayed', `Hi Dana,

We sincerely apologize for the extended delay and the frustration this has caused. You are right — waiting three months is unacceptable.

We will process a full refund for order #38782 immediately. You should see the refund reflected in your account within 5-10 business days.

We will confirm once the refund has been processed. Again, we are very sorry for the inconvenience.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== IMPORT TAX/DUTY ISSUE → LENA =====

// #108902 - FedEx asking for duty/import taxes, store said fees included
add(108902, 'LENA', '3-order-lena', 'Customer charged import duty despite store saying fees included — order #35288', `Hi Thomas,

Thank you for reaching out, and we sincerely apologize for this situation.

You are correct — our website states that customs fees and import taxes are included for EU customers. We will investigate this matter immediately with our logistics partner.

Please do not pay the FedEx charges for now. We will work to resolve this on your behalf and ensure you are not responsible for these fees. We may need you to forward us the FedEx letter so we can process the reimbursement.

We will get back to you as soon as possible with a resolution.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== THAILAND IMPORT PERMIT → JENNIFER =====

// #108922 - Asking for more details on permit for Thailand
add(108922, 'JENNIFER', '5-fallback-jennifer', 'Customer asking for details on Thailand import permit', `Hi Pavat,

Thank you for your prompt response!

The import permit required for shipping chessboards and wooden chess pieces to Thailand is issued by two agencies:

1. **Thai Ministry of Agriculture** — for wooden chess pieces (wood import regulations)
2. **Thai Industrial Standards Institute (TISI)** — for the chessboard electronics (UN3481, P.I.967-II battery classification)

You would need to apply for these permits before we can ship. However, if obtaining the permit is not feasible, we can arrange a cancellation and full refund for your order.

Please let us know how you would like to proceed.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== EVO / MOVE HARDWARE ISSUES → GWEN =====

// #108918 - Chessnut Move defective piece base (French customer)
add(108918, 'GWEN', '3-product-gwen', 'Move defective piece base — warranty replacement request', `Hi Jean-François,

Thank you for reaching out, and we're glad to hear you're enjoying your Chessnut Move overall!

We're sorry to hear about the defective piece base. Since your order is still under warranty, we will be happy to send you a replacement base.

To process the warranty replacement, could you please provide:
1. Your order number (#39814 confirmed)
2. A photo of the defective base (showing the issue)
3. The serial number of your Chessnut Move board (located on the bottom of the unit)

Once we receive these details, we will arrange a replacement to be sent to you right away.

Best,
Gwen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== EVO SOFTWARE → GWEN =====

// #108928 - Chessnut VIP subscription expired, EVO purchased on eBay
add(108928, 'GWEN', '3-product-gwen', 'EVO VIP subscription expired — purchased on eBay', `Hi,

Thank you for reaching out!

The Chessnut VIP training subscription is a separate service from the hardware. Since your EVO was purchased secondhand on eBay, the previous owner's subscription may have expired.

To purchase or renew a Chessnut VIP training subscription, please visit:
https://www.chessnutech.com

If you don't see the subscription option on our website, it may be that the training feature is currently bundled only with new EVO purchases. Please provide us with:
1. Your EVO's serial number (located on the bottom of the board)
2. The email address associated with your Chessnut app account

We'll check the status and let you know the best way to activate training on your device.

Best,
Gwen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PRODUCT QUESTIONS → JENNIFER =====

// #108936 - Order question: return period + payment options
add(108936, 'JENNIFER', '3-product-jennifer', 'Product inquiry — return period and payment options', `Hi Damien,

Thank you for reaching out!

Here's the information you requested:

**Return Policy:** We offer a 30-day return policy from the date of delivery. Items must be in their original packaging and unused condition.

**Payment Options:** We accept the following payment methods on our website (https://www.chessnutech.com):
- Credit/Debit Cards (Visa, Mastercard, American Express)
- PayPal
- Apple Pay / Google Pay

If you have any other questions, please don't hesitate to ask!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== VENDOR/W9 REQUEST → JENNIFER (fallthrough) =====

// #108903 - W9 and vendor setup form request (school district)
add(108903, 'JENNIFER', '5-fallback-jennifer', 'Vendor setup/W9 request — school district PO', `Hi Dana,

Thank you for reaching out.

We appreciate your interest in working with Chessnut. However, we currently handle all sales through our online store at https://www.chessnutech.com and do not have a vendor setup process for purchase orders at this time.

If you're looking to place a bulk order for your school district, please let us know the quantity and product(s) you're interested in, and we can explore options for you.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== ORDER CONFIRMATION (FROM SHOPIFY) → JENNIFER =====

// #108882 - "My order ???" — just a signature block, no clear request
add(108882, 'JENNIFER', '5-fallback-jennifer', 'Unclear inquiry — signature block only, no order number or clear question', `Hi,

Thank you for reaching out. Could you please provide your order number and let us know how we can assist you? We'd be happy to help!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== SHOPIFY INBOX MESSAGES → JENNIFER =====

// #108883 - Dana Abed "I haven't even received it!" (Shopify inbox notification)
add(108883, 'JENNIFER', '5-fallback-jennifer', 'Shopify inbox — Dana Abed: has not received order', `Hi Dana,

We're sorry to hear you haven't received your order yet. Could you please provide your order number so we can check the status and tracking details for you?

We will look into this right away.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108822 - Brad Jackson asking about order #40201 shipping status
add(108822, 'JENNIFER', '5-fallback-jennifer', 'Shopify inbox — Brad Jackson: order #40201 shipping status', `Hi Brad,

Thank you for reaching out. We apologize for the delay with your order #40201.

We are checking on the current status and will provide you with an update as soon as possible. We will send you the tracking information once your order has been dispatched.

Thank you for your patience.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108818 - Kay Tang: Can EVO be used in Malaysia? Warranty?
add(108818, 'JENNIFER', '3-product-jennifer', 'Product inquiry — EVO in Malaysia + warranty', `Hi Kay,

Thank you for your interest in the Chessnut EVO!

Yes, the Chessnut EVO can be used in Malaysia. It works globally as long as you have a Wi-Fi connection for online features and the Chessnut app (available on iOS and Android).

**Warranty:** We offer a 1-year manufacturer's warranty covering hardware defects. The warranty applies regardless of your location. If you experience any issues, you can contact us directly and we will assist with repairs or replacements.

You can order directly from our website at https://www.chessnutech.com, and we ship internationally.

Let us know if you have any other questions!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108817 - Lurajim Jimenez: "status of my order"
add(108817, 'JENNIFER', '5-fallback-jennifer', 'Shopify inbox — Lurajim Jimenez: order status', `Hi Lurajim,

Thank you for reaching out. Could you please provide your order number so we can check the status of your order for you?

We will look into it right away.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108814 - Anthony Stokes: How to redeem chessmind benefits?
add(108814, 'JENNIFER', '3-product-jennifer', 'Product inquiry — how to redeem ChessMind benefits', `Hi Anthony,

Thank you for reaching out!

To redeem your ChessMind benefits:
1. Download the Chessnut app (iOS or Android) if you haven't already
2. Log in or create an account
3. Connect your Chessnut board via Bluetooth
4. Go to Settings → Subscription or ChessMind to activate your benefits

If your ChessMind subscription was included with your purchase, it should activate automatically once you connect your board. If you're seeing an error, please let us know your order number and we'll look into it for you.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108813 - Micky Nachtigall: How to update firmware on Chessnut Pro?
add(108813, 'JENNIFER', '3-product-jennifer', 'Product inquiry — firmware update for Chessnut Pro', `Hi Micky,

Thank you for reaching out!

To update the firmware on your Chessnut Pro:
1. Open the Chessnut app on your smartphone or tablet
2. Connect your Chessnut Pro via Bluetooth
3. Go to Settings → Device → Firmware Update
4. If an update is available, tap "Update" and follow the on-screen instructions
5. Keep your board connected and powered on during the update

Please make sure your board has sufficient battery before starting the update process.

If you encounter any issues during the update, please let us know and we'll be happy to assist.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108804 - Anthony Stokes: Cannot find ChessMind
add(108804, 'JENNIFER', '3-product-jennifer', 'Product inquiry — cannot find ChessMind feature', `Hi Anthony,

Thank you for reaching out.

The ChessMind feature is available through the Chessnut app. Please make sure:
1. You have the latest version of the Chessnut app installed
2. Your Chessnut board is connected via Bluetooth
3. You're logged into your Chessnut account

If you still don't see the ChessMind feature, it may be available under a different menu. Please check:
- The main screen after connecting your board
- Settings → Features or Subscriptions

Could you also let us know which Chessnut board you're using? This will help us provide more specific guidance.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== SHOPIFY INBOX — PRODUCT QUESTIONS (SPANISH) =====

// #108879 + #108878 - Jesús de la Cruz Romeral: wants to buy board, needs help choosing, wants Spanish
add(108878, 'JENNIFER', '3-product-jennifer', 'Product inquiry (Spanish) — customer needs help choosing a board', `Hi Jesús,

Thank you for reaching out!

We'd be happy to help you choose the right electronic chess board. Here's a quick overview of our models:

**Chessnut Go** — Compact and affordable, great for beginners. Works with the Chessnut app for AI play and online chess.

**Chessnut Air** — Beautiful wooden board with LED move indicators. Great for home use and online play.

**Chessnut Pro** — Premium board with tournament-quality pieces and advanced features.

**Chessnut Move** — Our flagship with motorized pieces that move on their own!

You can see the full details and pricing at https://www.chessnutech.com. While our website and app are primarily in English, the boards work internationally.

If you have any specific questions about a particular model, please let us know!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108879 - Same customer, asking about prices
// Already covered by 108878

// ===== SHOPIFY INBOX — PRO COMPATIBILITY =====

// #108877 - Victor Narat: Is Chessnut Pro compatible with Chesstempo and Chessable?
add(108877, 'JENNIFER', '3-product-jennifer', 'Product inquiry — Chessnut Pro compatibility with Chesstempo/Chessable', `Hi Victor,

Thank you for your question!

The Chessnut Pro is compatible with popular chess platforms including Chess.com and Lichess through the Chessnut app. 

Regarding Chesstempo and Chessable: the Chessnut Pro can work with these platforms if they support external board input. However, direct integration may vary. We recommend checking each platform's settings for external board/hardware connection options.

For the best experience, the Chessnut Pro works seamlessly with:
- Chess.com (via the Chessnut app)
- Lichess (via the Chessnut app)
- The built-in Chessnut AI

If you need help setting up the connection, please let us know!

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PRODUCT ISSUE — BOTS NOT LOADING =====

// #108855 - "Never mind.. Chess.com issue; not a Chessnut issue" (resolved)
add(108855, 'JENNIFER', '5-fallback-jennifer', 'Customer resolved own issue — Chess.com problem, not Chessnut', null);

// #108845 - Problem Playing Bots (same customer as 108855, original message)
add(108845, 'JENNIFER', '5-fallback-jennifer', 'Bot loading issue — likely Chess.com related', `Hi Ken,

Thank you for reaching out.

The issue you're describing with bots not loading is typically related to the chess platform (Chess.com or Lichess) rather than the Chessnut board itself. Here are a few things to try:

1. Make sure the Chessnut app is updated to the latest version
2. Try disconnecting and reconnecting your board via Bluetooth
3. Check if the issue occurs on the chess platform's website or app independently

If the problem persists specifically when using your Chessnut board (but not when using the platform directly), please let us know and we'll investigate further.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== ORDER DELIVERY INQUIRY =====

// #108893 - Nina Tremblay: "When should I expect my order to be delivered?"
add(108893, 'JENNIFER', '5-fallback-jennifer', 'Shopify inbox — Nina Tremblay: delivery timeline', `Hi Nina,

Thank you for reaching out. Could you please provide your order number so we can check the expected delivery timeline for you?

We will look into the status right away.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108890 - Nina Tremblay: "Track my order"
add(108890, 'JENNIFER', '5-fallback-jennifer', 'Shopify inbox — Nina Tremblay: track my order', `Hi Nina,

To help you track your order, could you please provide your order number? We will look up the tracking details and send them to you right away.

Best,
Jennifer Chen
Customer Service Representative, Chessnut
https://chessnutech.com`);

// #108888 - Nina Tremblay: extra shipping fee for order 41259 ($141.33)
add(108888, 'LENA', '3-order-lena', 'Shopify inbox — Nina Tremblay: extra shipping fee for order #41259', `Hi Nina,

Thank you for confirming. We have noted the additional shipping fee of $141.33 for order #41259.

We will proceed with shipping your order right away. You will receive a tracking number via email once your order has been dispatched.

Best,
Lena
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== PAYPAL DISPUTE → JONY =====

// #108860 - PayPal case PP-R-QTN-623023036 ($758.10)
add(108860, 'JONY', '2-case-jony', 'PayPal dispute — PP-R-QTN-623023036, $758.10', `Hi,

We have received notification of a PayPal dispute that requires immediate attention.

Case ID: PP-R-QTN-623023036
Disputed Amount: $758.10 USD
Buyer: James Mathews (jamesmthews@yahoo.com)

Please log into your PayPal account and navigate to the Resolution Center to review and respond with shipping/tracking evidence before the deadline.

Best,
Jony He
Customer Service Representative, Chessnut
https://chessnutech.com`);

// ===== SPAM / AUTO-CLOSE =====

// #108896 - fuuffy.com shipping notification (Chinese) — sender spam
add(108896, 'CLOSE', 'spam', 'Sender spam — fuuffy.com shipping notification', null);

// #108894 - Bounce email from no-reply@mailsupport.aliyun.com → JENNIFER
add(108894, 'JENNIFER', '5-fallback-jennifer', 'Bounce email — mail delivery failed', null);

// #108886 - Marketing spam (growth assistant pitch)
add(108886, 'CLOSE', 'spam', 'Content spam — marketing pitch email', null);

// #108875 - Amazon notification (Spanish) — sender spam
add(108875, 'CLOSE', 'spam', 'Sender spam — Amazon notification email', null);

// #108873 - Bounce email from no-reply@mailsupport.aliyun.com → JENNIFER
add(108873, 'JENNIFER', '5-fallback-jennifer', 'Bounce email — mail delivery failed (iCloud over quota)', null);

// #108829 - Facebook group request (Dartsnut) — not relevant
add(108829, 'CLOSE', 'spam', 'Content spam — Facebook group request for Dartsnut', null);

// #108826 - Shopify promotional email
add(108826, 'CLOSE', 'spam', 'Sender spam — Shopify promotional email', null);

// #108819 - Amazon notification (Chinese) — empty body
add(108819, 'CLOSE', 'spam', 'Content spam — Amazon notification (empty body)', null);

// #108808 - 貨飛 shipping notification (Chinese) — not Chessnut related
add(108808, 'CLOSE', 'spam', 'Content spam — 貨飛 shipping notification (not Chessnut)', null);

// #108807 - 貨飛 shipping notification (duplicate)
add(108807, 'CLOSE', 'spam', 'Content spam — 貨飛 shipping notification duplicate', null);

// #108806 - Amazon FBA notification
add(108806, 'CLOSE', 'spam', 'Sender spam — Amazon FBA notification', null);

// ===== DEDUP: tickets 108879 and 108804 (Anthony Stokes duplicate) =====
// 108879 already handled (Spanish customer, covered by 108878)

// ===== FILTER: Remove tickets already assigned from toClose =====
const assignIds = new Set(assignments.map(a => a.id));
const filteredClose = toClose.filter(c => !assignIds.has(c.id));

// Also add any CLOSE assignments to toClose
assignments.filter(a => a.assignee === 'CLOSE').forEach(a => {
  if (!filteredClose.find(c => c.id === a.id)) {
    filteredClose.push({ id: a.id, reason: a.reason });
  }
});

// Remove CLOSE entries from assignments (they go to toClose instead)
const finalAssignments = assignments.filter(a => a.assignee !== 'CLOSE');

const output = {
  timestamp: new Date().toISOString(),
  toClose: filteredClose,
  assignments: finalAssignments
};

fs.writeFileSync(__dirname + '/triage_decisions.json', JSON.stringify(output, null, 2));
console.log('Generated triage_decisions.json');
console.log('  To close:', filteredClose.length, '(from pending:', pending.toClose.length, ')');
console.log('  Assignments:', finalAssignments.length);
console.log('  With draft:', finalAssignments.filter(a => a.draft_reply).length);
console.log('  Without draft:', finalAssignments.filter(a => !a.draft_reply).length);
