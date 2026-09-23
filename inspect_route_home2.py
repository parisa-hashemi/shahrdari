with open("index.html") as f:
    lines = f.readlines()

for j in range(8945, min(len(lines), 8990)):
    print(f"{j+1}: {lines[j]}", end='')
