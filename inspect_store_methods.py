with open("server/store.ts") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "recalculateStudyCaseBlockingState" in l or "fulfillDataRequest" in l:
        for j in range(max(0, i-5), min(len(lines), i + 40)):
            print(f"{j+1}: {lines[j]}", end='')
        break
