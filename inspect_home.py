with open("index.html") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "function Home(" in l or "const Home" in l or "Home=" in l.replace(" ",""):
        for j in range(max(0, i-2), min(len(lines), i + 40)):
            print(f"{j+1}: {lines[j]}", end='')
        break
