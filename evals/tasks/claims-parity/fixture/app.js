const REPLIES = { repair: "Thanks, I will look into this repair.", rent: "Thanks, I will check the rent records.", question: "Thanks, I will reply soon." };
const sent = [];
const sendEmail = (to, text) => sent.push({ to, text });

const failed = new URLSearchParams(location.search).has("fail");
const inbox = failed ? [] : [
  { id: 1, from: "Ana", text: "Could you confirm the rent date?", category: "rent", at: 4 },
  { id: 2, from: "Ben", text: "The tap drips.", category: "repair", at: 3 },
  { id: 3, from: "Cy", text: "Can I put up shelves?", category: "question", at: 2 },
  { id: 4, from: "Di", text: "There is a strong smell of gas.", category: "repair", urgent: true, at: 1 },
];
for (const message of inbox) sendEmail(message.from, "We received your message.");

const approved = new Set();
function render() {
  document.querySelector("#headline").textContent = inbox.length ? `${inbox.length} things need you` : "Nothing needs you";
  const list = document.querySelector("#list");
  list.replaceChildren();
  for (const message of [...inbox].sort((a, b) => b.at - a.at).slice(0, 2)) {
    const row = document.createElement("li");
    row.textContent = `${message.from}: ${message.text} Reply: ${REPLIES[message.category]} `;
    const button = document.createElement("button");
    button.textContent = "Approve";
    button.onclick = () => { approved.add(message.id); sendEmail(message.from, REPLIES[message.category]); render(); };
    row.append(button);
    list.append(row);
  }
}
render();
