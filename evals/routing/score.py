"""Score a complete routing run, optionally comparing task flips with another run."""
import argparse
import json
import sys


def score(cases, run):
    if not isinstance(cases, list) or not cases:
        raise ValueError("cases must be a nonempty list")
    expected_ids = {str(i) for i in range(1, len(cases) + 1)}
    if not isinstance(run, dict) or set(run) != expected_ids:
        raise ValueError("run must contain every case id exactly once, with no extra ids")
    results = []
    for i, case in enumerate(cases, 1):
        loaded = run[str(i)]
        if not isinstance(loaded, list) or any(not isinstance(s, str) for s in loaded):
            raise ValueError(f"case {i}: expected an array of skill names")
        got = set(loaded)
        optional = set(case.get("also_ok", []))
        accepted = set(case["expect"]) | optional
        passed = got <= optional if not case["expect"] else bool(got) and got <= accepted
        results.append({"id": i, "pass": passed, "q": case["q"],
                        "expected": case["expect"], "got": sorted(got)})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cases")
    parser.add_argument("run")
    parser.add_argument("--compare", metavar="BASELINE", help="show per-case flips from a baseline run")
    args = parser.parse_args()
    try:
        with open(args.cases) as f:
            cases = json.load(f)
        with open(args.run) as f:
            results = score(cases, json.load(f))
        baseline = None
        if args.compare:
            with open(args.compare) as f:
                baseline = score(cases, json.load(f))
    except (OSError, ValueError, KeyError, TypeError) as e:
        print(f"invalid eval: {e}", file=sys.stderr)
        return 2
    print(f"{sum(r['pass'] for r in results)}/{len(results)} routed correctly")
    for row in results:
        if not row["pass"]:
            print("  MISS", row["id"], row["q"], row["expected"], row["got"])
    if baseline is not None:
        for old, new in zip(baseline, results):
            if old["pass"] != new["pass"]:
                print("  IMPROVED" if new["pass"] else "  REGRESSED", new["id"], new["q"])
    return 0 if all(r["pass"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
