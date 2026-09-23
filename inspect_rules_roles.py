with open("index.html") as f:
    text = f.read()

import re
print("Roles match:")
for m in re.finditer(r'ROLES\s*=|const ROLES|var ROLES|let ROLES', text):
    print(text[m.start():m.start()+400])

print("\nRules in DB:")
for m in re.finditer(r'rules\s*:\s*\[', text):
    print(text[m.start():m.start()+400])
    break
