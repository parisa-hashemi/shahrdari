with open("server/store.ts") as f:
    lines = f.readlines()

for j in range(1315, min(len(lines), 1360)):
    print(f"{j+1}: {lines[j]}", end='')
