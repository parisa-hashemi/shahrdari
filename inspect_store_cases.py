with open("server/store.ts") as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'SEED_STUDY_CASES|studyCases|dataRequirements|rules', text)]
for idx in matches[:10]:
    start = max(0, idx - 50)
    end = min(len(text), idx + 250)
    print("--- MATCH AT", idx, "---")
    print(text[start:end])
