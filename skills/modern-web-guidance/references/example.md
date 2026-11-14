# Confirmation flow example

Request: add a confirmation step before deleting a saved draft. Preserve the current React component library, browser policy and cancellation behavior. Do not send the delete request until confirmation.

From the owning checkout:

```sh
node <skill-dir>/scripts/modern-web.mjs search "confirmation modal dialog"
node <skill-dir>/scripts/modern-web.mjs retrieve "dialog,accessibility"
```

The pinned search returns `dialog` and `accessibility` among its relevant matches. Read both; the decision is whether the existing dialog primitive already handles the needed semantics. If it does, keep it. If a native dialog is appropriate, check the guide's fallback and focus guidance against the supported browsers before choosing it.

The resulting plan keeps draft deletion behind explicit confirmation, gives Cancel initial focus where the destructive flow requires it, checks Escape and focus return, and verifies that closing the dialog sends no request. Reduced motion must not change the confirmation boundary. Exercise the component at phone and desktop widths and with the keyboard. These are planned checks, not claims that an example app passed them.

During review, scan the changed component directory:

```sh
node <skill-dir>/scripts/modern-web.mjs legacy-scan src/components --json
```

Review any candidate against its source and compatibility need. A dialog implemented by the maintained library is not automatically a defect. Record the guide IDs, the retained component or native choice, and the actual journey results in the PR. Unrelated modernization stays outside the change.

## Source and maintenance

- Guidance: [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance), stewarded by the Chrome, Edge, Firefox and MDN teams and the web community.
- Upstream release: `modern-web-guidance@1.0.0`, Node 22+, [commit `4dd968349e54ca45a05dd5c818fb035c9054b022`](https://github.com/GoogleChrome/modern-web-guidance/tree/4dd968349e54ca45a05dd5c818fb035c9054b022).
- Upstream code and guides: [Apache-2.0 licence](https://github.com/GoogleChrome/modern-web-guidance/blob/4dd968349e54ca45a05dd5c818fb035c9054b022/LICENSE); the npm archive retains its licence and third-party notices. This astack procedure and runner are original MIT-licensed integration code; upstream guides are retrieved rather than copied into astack.
- Documentation: [Chrome for Developers](https://developer.chrome.com/docs/modern-web-guidance).

Updating the pin requires reading the new CLI behavior, licence and compatibility guidance, exercising search/retrieve/local scan, and rerunning the runner contract and routing cases. Do not replace the pin with `latest`. A release changes the guidance snapshot, not the product's browser policy.
