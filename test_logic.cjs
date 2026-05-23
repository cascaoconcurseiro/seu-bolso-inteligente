const fs = require('fs');
let raw = fs.readFileSync('C:\\Users\\Wesley\\.gemini\\antigravity\\brain\\a9446267-01b8-4c61-a660-6393ee656d2f\\.system_generated\\steps\\936\\output.txt', 'utf8');

const startTag = '<untrusted-data-';
let startIdx = raw.indexOf(startTag);
startIdx = raw.indexOf('>', startIdx) + 1;

const endTag = '</untrusted-data-';
const endIdx = raw.indexOf(endTag);

raw = raw.substring(startIdx, endIdx).trim();

const data = JSON.parse(raw);
const rpcData = data[0].get_shared_invoice_data;
const transactions = rpcData.transactions;
const members = rpcData.members;
const user_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9';
const myMemberId = members.find(m => m.linked_user_id === user_id).id;

const invoiceMap = {};
members.forEach(m => invoiceMap[m.id] = []);

transactions.forEach(tx => {
  if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
  // wait, don't return on is_shared, because CASO 1 and 2 might process it!
  // In the real code:
  // if (tx.is_shared) return; is ONLY in CASO 3!!
  
  const isRefund = tx.type === 'INCOME';
  const splits = tx.transaction_splits || [];
  
  const isMeTheRealCreditor = (tx.user_id === user_id && !tx.payer_id) || 
                              (tx.payer_id === myMemberId && tx.payer_id != null);

  if (isMeTheRealCreditor) {
    splits.forEach(split => {
      if (!split.member_id || split.member_id === myMemberId) return;
      invoiceMap[split.member_id].push({
        tx_id: tx.id,
        desc: tx.description,
        amount: isRefund ? -split.amount : split.amount,
        type: isRefund ? 'DEBIT' : 'CREDIT',
        isPaid: split.is_settled === true || split.settled_by_creditor === true,
      });
    });
  } else {
    const mySplit = splits.find(s => s.member_id === myMemberId);
    if (mySplit) {
      const creatorMember = members.find(m => m.linked_user_id === tx.user_id);
      if (creatorMember) {
        invoiceMap[creatorMember.id].push({
          tx_id: tx.id,
          desc: tx.description,
          amount: mySplit.amount,
          type: 'DEBIT',
          isPaid: mySplit.is_settled === true || mySplit.settled_by_debtor === true,
        });
      }
    }
  }
});

let owedToMe = 0;
let settled = 0;
Object.values(invoiceMap).forEach(items => {
  items.forEach(item => {
    if (item.isPaid) settled += item.amount;
    else if (item.type === 'CREDIT') owedToMe += item.amount;
  });
});
console.log('owedToMe:', owedToMe, 'settled:', settled);
console.log('invoiceMap:', JSON.stringify(invoiceMap, null, 2));
