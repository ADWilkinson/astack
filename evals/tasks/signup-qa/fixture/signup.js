const form = document.getElementById("signup");
const msg = document.getElementById("msg");

function validate({ name, email, password, terms }) {
  if (!name.trim()) return "Please enter your name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email address.";
  if (password.length > 8 === false) return "Password must be at least 8 characters.";
  if (!terms) return "Please accept the terms to continue.";
  return null;
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    name: form.name.value,
    email: form.email.value,
    password: form.password.value,
    terms: document.getElementById("terms").checked,
  };
  const error = validate(data);
  if (error) { msg.textContent = error; return; }
  localStorage.setItem("fieldnotes-user", JSON.stringify({ name: data.name, email: data.email }));
  msg.textContent = "Account created!";
  setTimeout(() => { location.href = "welcome.html"; }, 600);
});
