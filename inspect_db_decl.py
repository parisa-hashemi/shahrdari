with open("index.html") as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'DB\s*=\s*\{', text)]
for idx in matches[:5]:
    print("Match at char", idx)
    print(text[max(0, idx-50):min(len(text), idx+200)])
