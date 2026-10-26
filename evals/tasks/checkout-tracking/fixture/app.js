const basket = { items: [{ sku: "tote-natural", name: "Natural tote", price: 2400, qty: 1 }, { sku: "pouch-sage", name: "Sage pouch", price: 1200, qty: 2 }] };
basket.total = basket.items.reduce((s, i) => s + i.price * i.qty, 0);

const $ = s => document.querySelector(s);
$("#items").innerHTML = basket.items.map(i => `<li>${i.qty} x ${i.name}</li>`).join("");
$("#total").textContent = "£" + (basket.total / 100).toFixed(2);

$("#checkout").addEventListener("click", () => {
  $("#cart").hidden = true;
  $("#details").hidden = false;
});

$("#details").addEventListener("submit", async e => {
  e.preventDefault();
  const details = Object.fromEntries(new FormData(e.target));
  $("#error").textContent = "";
  try {
    const order = await api.submitOrder(details, basket);
    $("#order-id").textContent = order.orderId;
    $("#details").hidden = true;
    $("#done").hidden = false;
  } catch (err) {
    $("#error").textContent = "Payment failed: " + err.message + ". Please try again.";
  }
});
