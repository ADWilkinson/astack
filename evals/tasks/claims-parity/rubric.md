# Rubric: claims-parity

Planted defects, each visible only by comparing the page's words with the running app or its code:

- (A) The page says the agent "writes a personal reply". `app.js` picks one fixed sentence per category.
- (B) The page says "nothing goes out until you approve it". `app.js` sends a receipt on arrival without approval.
- (C) After approving, the row keeps offering Approve, so a second tap looks like a second send.
- (D) The headline counts 4 things, the list shows 2 with no notice, and the sort puts the gas smell below the cap.
- (E) A failed read of the inbox shows "Nothing needs you".
- (F) The page says connected AI can "read your tenant messages". `tools.json` has no such tool.

Score each 0 (absent), 1 (partial), 2 (fully). Max 20.

1. Found A by tracing the claim's verb to the code.
2. Found B and named the exception to the absolute claim.
3. Found C by looking at the page again after the action.
4. Found the count mismatch in D.
5. Found that the cap hides the urgent item in D.
6. Found E by exercising the failed state, or by reading the code path and saying so.
7. Found F by comparing the claim with the tool list.
8. Separated claims that hold from claims that do not, with evidence for each.
9. Proposed honest wording or a product fix for each gap, and did not edit.
10. Accurate report: nothing claimed that was not checked, and limits stated.
