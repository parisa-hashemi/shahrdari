with open("server/api.ts") as f:
    lines = f.readlines()

print("Lines in server/api.ts:", len(lines))
for i in range(min(120, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
