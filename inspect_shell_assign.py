with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "Shell=" in l.replace(" ", ""):
        print(f"{i+1}: {lines[i]}")
        for j in range(i+1, min(len(lines), i + 40)):
            print(f"{j+1}: {lines[j]}", end='')
        break
