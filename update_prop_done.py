with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace if(!a.done) with check against anDone(id)
c = c.replace(
    "  if(!a.done){\n    // Integrate with modern Study Case & Blocker architecture",
    "  const isDone = a.done || anDone(id);\n  if(!isDone){\n    // Integrate with modern Study Case & Blocker architecture"
)

c = c.replace(
    "function PropImpact(id){\n  const p=prop(id), a=anState(id);\n  if(!a.done)",
    "function PropImpact(id){\n  const p=prop(id), a=anState(id);\n  const isDone = a.done || anDone(id);\n  if(!isDone)"
)

c = c.replace(
    "function PropComparison(id){\n  const a=anState(id);\n  if(!a.done)",
    "function PropComparison(id){\n  const a=anState(id);\n  const isDone = a.done || anDone(id);\n  if(!isDone)"
)

c = c.replace(
    "function PropFindings(id){\n  const a=anState(id);\n  if(!a.done)",
    "function PropFindings(id){\n  const a=anState(id);\n  const isDone = a.done || anDone(id);\n  if(!isDone)"
)

c = c.replace(
    "function PropEvidence(id){\n  const p=prop(id), a=anState(id);\n  if(!a.done)",
    "function PropEvidence(id){\n  const p=prop(id), a=anState(id);\n  const isDone = a.done || anDone(id);\n  if(!isDone)"
)

c = c.replace(
    "function PropDecision(id){\n  const p=prop(id), a=anState(id);\n  if(!a.done)",
    "function PropDecision(id){\n  const p=prop(id), a=anState(id);\n  const isDone = a.done || anDone(id);\n  if(!isDone)"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Updated all 6 proposal tabs to respect anDone(id)!")
