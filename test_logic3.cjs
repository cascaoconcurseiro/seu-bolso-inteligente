import fs from 'fs';

const raw = fs.readFileSync('C:\\Users\\Wesley\\.gemini\\antigravity\\brain\\a9446267-01b8-4c61-a660-6393ee656d2f\\.system_generated\\steps\\1024\\output.txt', 'utf8');

const startIdx = raw.indexOf('[{"get_shared_invoice_data":');
const endIdx = raw.lastIndexOf('}]') + 2;

const jsonStr = raw.substring(startIdx, endIdx);
const data = JSON.parse(jsonStr);
const rpcData = data[0].get_shared_invoice_data;
const transactions = rpcData.transactions;
const members = rpcData.members;
const user_id = '56ccd60b-641f-4265-bc17-7b8705a2f8c9';
const myMemberId = members.find(m => m.linked_user_id === user_id).id;

const invoiceMap = {};
members.forEach(m => invoiceMap[m.id] = []);

transactions.forEach(tx => {
  if (tx.type !== 'EXPENSE' && tx.type !== 'INCOME') return;
  
  // Notice we commented out if (tx.is_shared) return; because it's only in CASO 3!
  
  const isRefund = tx.type === 'INCOME';
  const splits = tx.transaction_splits || [];
  
  const isMeTheRealCreditor = (tx.user_id === user_id && !tx.payer_id) || 
                              (tx.payer_id === myMemberId && tx.payer_id != null);

  if (isMeTheRealCreditor) {
    splits.forEach(split => {
      if (!split.member_id || split.member_id === myMemberId) return;
      invoiceMap[split.member_id].push({
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
let iOwe = 0;
Object.values(invoiceMap).forEach(items => {
  items.forEach(item => {
    if (item.isPaid) settled += item.amount;
    else if (item.type === 'CREDIT') owedToMe += item.amount;
    else iOwe += item.amount;
  });
});
console.log('owedToMe:', owedToMe, 'iOwe:', iOwe, 'settled:', settled);
console.log(JSON.stringify(invoiceMap, null, 2));
