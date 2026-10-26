// PostHog is loaded here in production. Locally this stub records calls so you can inspect them.
window.posthog = window.posthog || {
  _calls: [],
  capture(event, props) { this._calls.push({ event, props, at: Date.now() }); console.log("[posthog]", event, props); },
  identify(id, props) { this._calls.push({ identify: id, props }); },
};
