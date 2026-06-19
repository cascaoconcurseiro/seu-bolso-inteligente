import sys

content = open('src/components/credit-cards/ShareCardDialog.tsx', 'r', encoding='utf-8').read()

# Imports
content = content.replace(
    'import { UserAvatar } from "@/components/ui/user-avatar";',
    'import { UserAvatar } from "@/components/ui/user-avatar";\nimport { useAuth } from "@/contexts/AuthContext";\nimport { Input } from "@/components/ui/input";'
)

# Hooks
old_hooks = '''  const { data: familyMembers = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: sharedCards = [], isLoading: sharedLoading } = useSharedCreditCards(card?.id);
  const inviteMutation = useInviteSharedCard();
  const revokeMutation = useRevokeSharedCard();'''
new_hooks = '''  const { user } = useAuth();
  const { data: familyMembers = [], isLoading: membersLoading } = useFamilyMembers();
  const { data: sharedCards = [], isLoading: sharedLoading } = useSharedCreditCards(card?.id);
  const inviteMutation = useInviteSharedCard();
  const revokeMutation = useRevokeSharedCard();
  const [inviteLimits, setInviteLimits] = useState<Record<string, string>>({});'''
content = content.replace(old_hooks, new_hooks)

# Filter
old_filter = "const availableMembers = familyMembers.filter(m => m.linked_user_id && m.status === 'active');"
new_filter = "const availableMembers = familyMembers.filter(m => m.linked_user_id && m.status === 'active' && m.linked_user_id !== user?.id);"
content = content.replace(old_filter, new_filter)

# handleInvite
old_invite = '''  const handleInvite = (member: any) => {
    inviteMutation.mutate({
      accountId: card.id,
      userId: member.linked_user_id,
      cardName: card.name
    });
  };'''
new_invite = '''  const handleInvite = (member: any) => {
    inviteMutation.mutate({
      accountId: card.id,
      userId: member.linked_user_id,
      cardName: card.name,
      creditLimit: inviteLimits[member.id] ? Number(inviteLimits[member.id]) : null
    });
  };'''
content = content.replace(old_invite, new_invite)

# UI for Invite
old_ui = '''                      <Button size="sm" variant="outline" onClick={() => handleInvite(member)} disabled={inviteMutation.isPending}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Convidar
                      </Button>
                    </div>'''
new_ui = '''                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <Input 
                          type="number" 
                          placeholder="Limite (Opcional)" 
                          className="w-32 h-8 text-xs" 
                          value={inviteLimits[member.id] || ''} 
                          onChange={(e) => setInviteLimits({...inviteLimits, [member.id]: e.target.value})} 
                        />
                        <Button size="sm" variant="outline" onClick={() => handleInvite(member)} disabled={inviteMutation.isPending}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Convidar
                        </Button>
                      </div>
                    </div>'''
content = content.replace(old_ui, new_ui)

open('src/components/credit-cards/ShareCardDialog.tsx', 'w', encoding='utf-8').write(content)
print("Updated ShareCardDialog.tsx")
