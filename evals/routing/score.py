"""Score a routing run against cases.

A case passes when:
- it expects no skill and the run loaded none (or only skills listed in also_ok), or
- it expects skills and the run loaded at least one, all of them from expect + also_ok.
"""
import json, sys

cases = json.load(open(sys.argv[1]))
run = json.load(open(sys.argv[2]))
fails = []
for i, c in enumerate(cases, 1):
    got = set(run.get(str(i), []))
    accepted = set(c["expect"]) | set(c.get("also_ok", []))
    ok = got <= set(c.get("also_ok", [])) if not c["expect"] else bool(got) and got <= accepted
    if not ok:
        fails.append((i, c["q"], c["expect"], sorted(got)))
print(f"{len(cases) - len(fails)}/{len(cases)} routed correctly")
for f in fails:
    print("  MISS", *f)
