const tickets = require('./test_triage.js');

let jonyJenniferTurn = 0;
const AGENTS = { JONY: "Jony He", JENNIFER: "Jennifer Chen", LENA: "Lena Wang", GWEN: "Gwen Liu" };

for (const t of tickets) {
    let textToAnalyze = (t.subject + " " + (t.description_text || "")).toLowerCase();
    let assigneeId = "Default";

    if (/(order confirmed|has shipped|new message from|delivery failed|receipt|payment received)/i.test(textToAnalyze) || 
        /(solopreneur sale|public terms application|matter intake processing|best deals|gpu power|obsessed|catalog submission|security review|unfulfillable)/i.test(textToAnalyze) ||
        /(authorized a payment|billing agreement|subscribed to.+reminder)/i.test(textToAnalyze) ||
        /mailchimp/i.test(textToAnalyze) || 
        /(e-mail an|e-mail a |valida tu direcci.n|vorbereitung auf die neue|refund initiated|va.i z.silku)/i.test(textToAnalyze) ||
        /(退信|包裹已經送達|運單.*收據|運單派送延誤|卖家未发货订单关闭|预扣罚单|全球速卖通客户满意中心|福利等你领取|系统通知)/i.test(textToAnalyze) ||
        /(unsubscribe|reset your password|please rate|no-reply|do not reply|auto-reply)/i.test(textToAnalyze)) {
        
        assigneeId = "CLOSED (Spam/Notice)";
    }
    // JONY: 亚马逊后台通知、入库、争议、特定需求
    else if (/(dispute|will close on|wms|amazon order|inquiry)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JONY;
    }
    // JENNIFER EXCEPTIONS (Message de Chessnut, Message from Chessnut)
    else if (/(message de chessnut|message from chessnut)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JENNIFER;
    }
    // LENA (物流/订单大管家): 匹配物流、催单、改地址、调价等
    else if (/(shipping|my order|address|discount|price adjustment|delay|tracking|delivery|sipping|order no|order #|order number|missing|速卖通物流|ppl)/i.test(textToAnalyze) && !/(evo|return)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.LENA;
    }
    // GWEN: 负责 EVO, MOVE 等产品相关的售前售后、售后退换货、固件等技术问题
    else if (/(evo|move)/i.test(textToAnalyze) && /(return|defective|broken|magnetized|firmware|review|star|base|charging|won\'t connect|recognition|not recognize|pgn|training)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.GWEN;
    }
    // JENNIFER: 负责 AIR, AIR+, PRO, GO 等产品相关的售前售后、售后退换货、固件等技术问题
    else if (/(air|pro|go)/i.test(textToAnalyze) && /(return|defective|broken|magnetized|firmware|review|star|base|charging|won\'t connect|recognition|not recognize|pgn|training)/i.test(textToAnalyze)) {
        assigneeId = AGENTS.JENNIFER;
    }
    // 未提及具体型号但属于退换货和技术问题的泛泛邮件分配 (默认分别平分)
    else if (/(return|defective|broken|magnetized|firmware|review|star|base|charging|won\'t connect|recognition|not recognize|pgn|training)/i.test(textToAnalyze)) {
        assigneeId = (jonyJenniferTurn % 2 === 0) ? AGENTS.GWEN : AGENTS.JENNIFER;
        jonyJenniferTurn++;
    }
    // JENNIFER / JONY (平台客服支持与售后兜底): 其他所有工单 比如 PayPal、售前疑问
    else {
        assigneeId = (jonyJenniferTurn % 2 === 0) ? AGENTS.JONY : AGENTS.JENNIFER;
        jonyJenniferTurn++;
    }

    console.log(`[${assigneeId}] ${t.id} - ${t.subject}`);
}
