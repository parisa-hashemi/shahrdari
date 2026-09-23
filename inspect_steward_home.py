with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function HomeSteward" in l or "function HomeRuleman" in l:
        print(f"--- MATCH AT {i+1} ---")
        for j in range(i, min(len(lines), i + 45)):
            print(f"{j+1}: {lines[j]}", end='')
