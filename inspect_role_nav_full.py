with open("index.html") as f:
    lines = f.readlines()

for j in range(6865, 6915):
    print(f"{j+1}: {lines[j]}", end='')
