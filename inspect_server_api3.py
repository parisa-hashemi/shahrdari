with open("server/api.ts") as f:
    lines = f.readlines()

for i in range(300, len(lines)):
    print(f"{i+1}: {lines[i]}", end='')
