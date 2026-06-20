const fs = require('fs');
const path = require('path');

function fixTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Cast data inside mockResolvedValueOnce
  // vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: mockResponse, error: null, ... })
  // becomes
  // vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({ data: mockResponse as any, error: null, ... })
  content = content.replace(/data:\s*mockResponse/g, 'data: mockResponse as any');
  content = content.replace(/data:\s*mockResponseError/g, 'data: mockResponseError as any');
  
  // 2. Add missing p_user_id parameter to rpc calls
  // p_amount: mockAmount
  // becomes
  // p_amount: mockAmount, p_user_id: 'mock-user-id'
  content = content.replace(/p_amount:\s*mockAmount\s*\}/g, "p_amount: mockAmount,\n        p_user_id: 'mock-user-id'\n      }");
  content = content.replace(/p_amount:\s*50.00\s*\}/g, "p_amount: 50.00,\n        p_user_id: 'mock-user-id'\n      }");
  content = content.replace(/p_amount:\s*0\s*\}/g, "p_amount: 0,\n        p_user_id: 'mock-user-id'\n      }");
  content = content.replace(/p_amount:\s*-50.00\s*\}/g, "p_amount: -50.00,\n        p_user_id: 'mock-user-id'\n      }");
  
  // 3. Cast data on the result of the RPC call so that data.success works
  // const { data, error } = await supabase.rpc('settle_split', ...);
  // expect(data.success).toBe(true); -> fails because data is Json.
  // I will replace `expect(data.success)` with `const responseData = data as any; expect(responseData.success)` 
  // Actually, easier: replace `data.` with `(data as any).` in assertions.
  content = content.replace(/expect\(data\.([a-zA-Z_]+)\)/g, 'expect((data as any).$1)');
  content = content.replace(/data\.([a-zA-Z_]+)/g, '(data as any).$1');
  
  // Wait, let's just make sure `(data as any).(data as any).` doesn't happen.
  // The first replace handles expect(data.prop)
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

const files = [
  path.join(__dirname, 'src/test/settle_split.test.ts'),
  path.join(__dirname, 'src/test/settlementAtomicity.test.ts')
];

files.forEach(fixTestFile);
