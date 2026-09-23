with open("studyCase.js") as f:
    lines = f.readlines()

print("Lines in studyCase.js:", len(lines))
for i in range(min(100, len(lines))):
    print(f"{i+1}: {lines[i]}", end='')
