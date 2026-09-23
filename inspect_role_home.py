with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function roleHome(" in l:
        for j in range(i, min(len(lines), i + 60)):
            print(f"{j+1}: {lines[j]}", end='')
        break
