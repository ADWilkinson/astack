# Claims audit

Use this when the question is whether the product lives up to how it is sold. Passing tests and tidy screens do not answer it. Each claim on the page has to survive contact with the running product.

## 1. Write the claims down

Read the landing page, pricing and any product copy. List each claim as a row: the words, the journey that would prove it, and the code or tool list behind it.

```
Claim                          Journey                     Evidence         Result
"prepares a reply"             tenant message to approval  contract.ts      holds, fixed template per category
"you approve what goes out"    message arrives             service.ts       false: receipts send automatically
```

## 2. Read the verbs

Most overclaims hide in one word. Check what the code does before accepting these:

| The copy says | Check | Often really |
| --- | --- | --- |
| writes, drafts, personalises | Does a model write this text, or is it picked? | A fixed template, so "prepares" or "suggests" |
| arranges, handles, manages, follows up | Does the software act, or remind a person to? | A reminder. In a regulated trade these words can also carry legal weight |
| everything, every, always, never, nothing | Read the code for one exception | An automatic receipt or an opt-in send |
| connects to, reads, works with | Compare with the real tool or API list | Most of it, minus the item the sentence names |
| live, real time, instantly | Find the schedule | A daily job or a cached read |

A claim can be true and still need rewording. Name the exception on the page where the claim is made.

## 3. Walk it as a new customer

Use a fresh account with no data. Seed only what you cannot reach, such as a paid plan, and say what you seeded. Run the journey through to the outcome, then do these checks that tests rarely cover:

- Reload the page after every approve, send or save. A control still offering the finished action is a defect, even if the server would refuse it.
- Compare counts with rows. A headline count must equal the rows you can reach. A capped list says so, and the cap never hides urgent work.
- Make one source fail. "All clear" and "nothing to do" may only appear when every source answered.
- Open the last screen a customer's customer sees. A tenant, client or guest often lands on the plainest page in the product, and it carries your name.
- Read inner screens as closely as the hero. Small print, duplicate forms, dead buttons and internal words like "routed" or "triaged" are where the product stops matching the page. Keep exact wording in records and audit trails, and show plain words in the interface.
- Compare the picture with the flow. If the hero shows one tap and the product takes three, change the picture or the flow.

## 4. Sort what you find

A guard that refuses your test data is usually working. Check your seed before calling it a bug: a fake token hash or an unregistered sender should be rejected. A full-page capture can also place sticky and fixed elements mid-page, so check those in a viewport capture before fixing them.

Report what holds as well as what does not. Every gap gets one of three outcomes: fix the product, reword the claim, or remove it. Name anything you could not exercise, such as real delivery or a paid checkout.
