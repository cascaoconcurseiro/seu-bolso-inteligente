import sys

# Update useSharedCreditCards.ts
content = open('src/hooks/useSharedCreditCards.ts', 'r', encoding='utf-8').read()

# 1. Update SharedCreditCard interface
content = content.replace(
    "status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';",
    "status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';\n  credit_limit?: number | null;"
)

# 2. Update useInviteSharedCard
old_invite_args = "mutationFn: async ({ accountId, userId, cardName }: { accountId: string; userId: string; cardName: string }) => {"
new_invite_args = "mutationFn: async ({ accountId, userId, cardName, creditLimit }: { accountId: string; userId: string; cardName: string; creditLimit?: number | null }) => {"
content = content.replace(old_invite_args, new_invite_args)

old_invite_update = ".update({ status: 'PENDING' })"
new_invite_update = ".update({ status: 'PENDING', credit_limit: creditLimit || null })"
content = content.replace(old_invite_update, new_invite_update)

old_invite_insert = """          .insert({
            account_id: accountId,
            user_id: userId,
            status: 'PENDING',
          })"""
new_invite_insert = """          .insert({
            account_id: accountId,
            user_id: userId,
            status: 'PENDING',
            credit_limit: creditLimit || null,
          })"""
content = content.replace(old_invite_insert, new_invite_insert)

# 3. Update useRespondSharedCardInvite
old_respond_args = "mutationFn: async ({ inviteId, status }: { inviteId: string; status: 'ACCEPTED' | 'REJECTED' }) => {"
new_respond_args = "mutationFn: async ({ inviteId, status, creditLimit }: { inviteId: string; status: 'ACCEPTED' | 'REJECTED'; creditLimit?: number | null }) => {"
content = content.replace(old_respond_args, new_respond_args)

old_respond_update = ".update({ status })"
new_respond_update = ".update({ status, ...(creditLimit ? { credit_limit: creditLimit } : {}) })"
content = content.replace(old_respond_update, new_respond_update)

open('src/hooks/useSharedCreditCards.ts', 'w', encoding='utf-8').write(content)
print("Updated useSharedCreditCards.ts")
