// Fake payments API. Roughly 1 in 4 payments is declined; responses take 300-900ms.
window.api = {
  async submitOrder(details, basket) {
    await new Promise(r => setTimeout(r, 300 + Math.random() * 600));
    if (Math.random() < 0.25) throw Object.assign(new Error("Card declined"), { code: "card_declined" });
    return { orderId: "ord_" + Math.random().toString(36).slice(2, 8), amount: basket.total };
  },
};
