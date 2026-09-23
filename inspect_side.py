with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function Side(" in l or "const Side" in l or "Side=" in l.replace(" ",""):
        for j in range(max(0, i-2), min(len(lines), i + 50)):
            print(f"{j+1}: {lines[j]}", end='')
        break
