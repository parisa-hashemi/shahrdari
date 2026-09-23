with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "const PERMS={" in l:
        for j in range(i, min(len(lines), i + 35)):
            print(f"{j+1}: {lines[j]}", end='')
        break
