with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "saveDB" in l or "loadDB" in l:
        print(f"Line {i+1}: {l}", end='')
