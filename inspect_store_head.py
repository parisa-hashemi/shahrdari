with open("server/store.ts") as f:
    lines = f.readlines()

print("Total lines in server/store.ts:", len(lines))
for i in range(min(120, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
