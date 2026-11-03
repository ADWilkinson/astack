# Workspace at scale

A dashboard built on two demo records usually fails at thirty. Before calling an operating surface done, run it at the plan limit, or at the largest account you expect, using records that look real.

## Seed it, then look

Create a local database with a believable portfolio: the plan's maximum number of parents, a mix of urgent and routine work, and long names. Go through the product's own schema, and satisfy its guards rather than bypassing them. Then read the screen before designing anything. The first capture usually names the work: walls of identical cards, a headline that disagrees with the list, links into closed sections.

## The contract

| Rule | What it means |
| --- | --- |
| One screen of work | Tabs or sections beside a sticky rail of recent activity and tools, in place of a long scroll. Every tab can be linked to by address. |
| Find, narrow, page | Search covering the words people remember, including postcodes and codes. Filters with counts, shown only for kinds that exist. Twelve to fifteen rows, then "Show more". |
| Urgent first, never paged | Split urgent from the rest before cutting to a page. Sorting after the cut hides emergencies under routine rows. Rank urgent parents first in list views too, and mark them in the row. |
| Counts are promises | A headline or tab count equals the rows reachable from it. "Showing 15 of 100" is true at every step of paging and filtering. A capped list says so on the screen. |
| "All clear" is earned | Say "nothing needs you" only when every source answered and nothing is open. A failed read shows a neutral title and says what could not be checked. |
| One rule across views | The summary and the detail page use one definition of "needs you". If they disagree, the owner stops trusting both. |
| Status survives on phones | A badge hidden below a breakpoint needs a text equivalent in the row. |
| Long detail folds | A list of forms becomes a list of rows, with the first and anything urgent open. Opening from a link must open the target row. |
| One name per item | A record named by category in one tab and by a generic word in another reads as two records. |

## Cost

Measure rather than guess, with the account at the limit. Read waiting items in one query, not one per parent. Check raw and compressed HTML, because every tab's server-rendered content counts and 3 MB is easy to reach by accident. Give the heaviest lists a client list with paging, or cap them and point to the parent. Stream the shell, with a skeleton for the slow part.

## Phones

A workspace used on a phone gets a bottom tab bar for its places, with icons, labels and a safe-area inset, replacing the menu. If tabs change the address with `history.replaceState` or `pushState`, no `hashchange` fires, so anything else following the address needs its own event. Tap a bar item, change an inner tab, and confirm the bar updated.
