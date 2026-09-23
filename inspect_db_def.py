with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "const DB=" in l.replace(" ","") or "let DB=" in l.replace(" ","") or "var DB=" in l.replace(" ",""):
        print(f"Match line {i+1}: {lines[i]}")
        for j in range(i+1, min(len(lines), i + 35)):
            print(f"{j+1}: {lines[j]}", end='')
        break
