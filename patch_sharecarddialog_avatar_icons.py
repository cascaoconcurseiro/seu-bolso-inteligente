import sys

content = open('src/components/credit-cards/ShareCardDialog.tsx', 'r', encoding='utf-8').read()

# Update UserAvatar for sharedCards
old_avatar1 = "<UserAvatar name={sc.user?.full_name || 'Usuário'} avatarUrl={sc.user?.avatar_url} size=\"sm\" />"
new_avatar1 = "<UserAvatar name={sc.user?.full_name || 'Usuário'} avatarUrl={sc.user?.avatar_url} iconId={sc.user?.avatar_icon} colorId={sc.user?.avatar_color} size=\"sm\" />"
content = content.replace(old_avatar1, new_avatar1)

# Update UserAvatar for availableMembers
old_avatar2 = "<UserAvatar name={member.name} avatarUrl={member.avatar_url} size=\"sm\" />"
new_avatar2 = "<UserAvatar name={member.name} avatarUrl={member.avatar_url} iconId={member.avatar_icon} colorId={member.avatar_color} size=\"sm\" />"
content = content.replace(old_avatar2, new_avatar2)

open('src/components/credit-cards/ShareCardDialog.tsx', 'w', encoding='utf-8').write(content)
print("Updated ShareCardDialog.tsx with iconId and colorId")
