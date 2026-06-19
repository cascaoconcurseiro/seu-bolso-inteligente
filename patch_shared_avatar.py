import sys

content = open('src/components/credit-cards/ShareCardDialog.tsx', 'r', encoding='utf-8').read()

old_avatar = "<UserAvatar name={sc.user?.full_name || 'Usuário'} size=\"sm\" />"
new_avatar = "<UserAvatar name={sc.user?.full_name || 'Usuário'} avatarUrl={sc.user?.avatar_url} size=\"sm\" />"
content = content.replace(old_avatar, new_avatar)

open('src/components/credit-cards/ShareCardDialog.tsx', 'w', encoding='utf-8').write(content)
print("Updated ShareCardDialog.tsx with avatarUrl")
