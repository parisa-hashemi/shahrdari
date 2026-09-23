with open("server/store.ts") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "SEED_STUDY_CASES" in l:
        for j in range(i, min(len(lines), i + 120)):
            print(f"{j+1}: {lines[j]}", end='')
        break
