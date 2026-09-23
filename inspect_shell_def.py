with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "Shell(" in l and "{" in l:
        print(f"{i+1}: {lines[i]}", end='')
        for j in range(i+1, min(len(lines), i + 30)):
            print(f"{j+1}: {lines[j]}", end='')
        break
