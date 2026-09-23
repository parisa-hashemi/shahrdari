with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function Shell(" in l or "function Sidebar(" in l or "function Nav(" in l:
        for j in range(max(0, i-2), min(len(lines), i + 35)):
            print(f"{j+1}: {lines[j]}", end='')
        break
