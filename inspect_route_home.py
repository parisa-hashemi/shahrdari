with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function route(" in l or "const route" in l:
        for j in range(i, min(len(lines), i + 40)):
            print(f"{j+1}: {lines[j]}", end='')
        break
