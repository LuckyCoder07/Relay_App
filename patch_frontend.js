const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'relay-frontend/src/App.jsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Remove window.storage shim (lines 1-10)
content = content.replace(/\/\/ window\.storage shim[\s\S]*?\}\n/, '');

// 2. Replace everything from const API = "https://dummyjson.com"; to loadPrefs with our new API logic
const oldApiBlockRegex = /const API = "https:\/\/dummyjson\.com";[\s\S]*?async function savePrefs\(email, prefs\) \{ try \{ await window\.storage\.set\("relay:prefs:" \+ email, JSON\.stringify\(prefs\), false\); \} catch \{\} \}/;

const newApiBlock = \`const API = "http://localhost:4000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("relay:token");
  return token ? { Authorization: \`Bearer \${token}\` } : {};
}

async function fetchJSON(url, options = {}) {
  const r = await fetch(url, { ...options, headers: { ...options.headers, ...getAuthHeaders() } });
  if (!r.ok) throw new Error("Request failed: " + r.status);
  return r.json();
}

const PLATFORMS = {
  Amazon: { color: "#FF9900", search: (q) => \`https://www.amazon.in/s?k=\${encodeURIComponent(q)}\` },
  Flipkart: { color: "#2874F0", search: (q) => \`https://www.flipkart.com/search?q=\${encodeURIComponent(q)}\` },
  Myntra: { color: "#FF3F6C", search: (q) => \`https://www.myntra.com/\${encodeURIComponent(q.replace(/ /g, "-"))}\` },
  Croma: { color: "#00B0B9", search: (q) => \`https://www.croma.com/searchB?q=\${encodeURIComponent(q)}\` },
  "Reliance Digital": { color: "#E4032E", search: (q) => \`https://www.reliancedigital.in/search?q=\${encodeURIComponent(q)}\` },
  Nykaa: { color: "#E32A6D", search: (q) => \`https://www.nykaa.com/search/result/?q=\${encodeURIComponent(q)}\` },
};

const PAYMENT_METHODS = ["HDFC Credit Card", "ICICI Credit Card", "SBI Credit Card", "Axis Credit Card", "Amazon Pay UPI", "Flipkart UPI", "Any UPI", "Cash on Delivery"];

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const titleCase = (s) => (s || "").replace(/-/g, " ").replace(/\\b\\w/g, (c) => c.toUpperCase());

async function fetchDefaultCatalog(payment = "") {
  return fetchJSON(\`\${API}/products?payment=\${encodeURIComponent(payment)}\`);
}
async function fetchSearch(q, payment = "") {
  return fetchJSON(\`\${API}/products?search=\${encodeURIComponent(q)}&payment=\${encodeURIComponent(payment)}\`);
}
async function fetchByCategory(slug, payment = "") {
  return fetchJSON(\`\${API}/products?category=\${encodeURIComponent(slug)}&payment=\${encodeURIComponent(payment)}\`);
}
async function fetchCategoryList() {
  return fetchJSON(\`\${API}/products/categories\`);
}

function rankOffers(product, preferredPayment) {
  // Now uses the pre-ranked array from the backend
  return product.ranked || [];
}

async function loadPrefs() {
  const t = localStorage.getItem("relay:prefs");
  return t ? JSON.parse(t) : { payment: "", chat: [] };
}
async function savePrefs(prefs) {
  localStorage.setItem("relay:prefs", JSON.stringify(prefs));
  if (prefs.payment) {
    fetch(\`\${API}/auth/me/payment-preference\`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ preferredPayment: prefs.payment })
    }).catch(()=>{});
  }
}

async function loadOrders() {
  try { return await fetchJSON(\`\${API}/orders\`); } catch { return []; }
}
async function loadAllOrders() {
  try { return await fetchJSON(\`\${API}/orders/all\`); } catch { return []; }
}\`;

content = content.replace(oldApiBlockRegex, newApiBlock);

// 3. Update auth calls in RelayApp
// Replace dummy loadUsers / login logic with backend /api/auth
content = content.replace(/async function loadUsers\(\)[\s\S]*?async function saveUsers\(users\) \{ try \{ await window\.storage\.set\("relay:users", JSON\.stringify\(users\), true\); \} catch \{\} \}/, '');

content = content.replace(/setUser\(null\); setOrders\(\[\]\); setPrefs\(\{ payment: "", chat: \[\] \}\); goto\("landing"\);/, 
  \`setUser(null); localStorage.removeItem("relay:token"); localStorage.removeItem("relay:user"); setOrders([]); setPrefs({ payment: "", chat: [] }); goto("landing");\`);

// 4. Update 'offer.offer' to 'offer.paymentOffer' and 'offer.delivery' to 'offer.deliveryDays' in UI components
content = content.replace(/o\.offer/g, "o.paymentOffer");
content = content.replace(/o\.delivery/g, "o.deliveryDays");
content = content.replace(/best\.offer/g, "best.paymentOffer");
content = content.replace(/offer\.offer/g, "offer.paymentOffer");
content = content.replace(/offer\.delivery/g, "offer.deliveryDays");
content = content.replace(/setOffer\(i, "offer"/g, 'setOffer(i, "paymentOffer"');
content = content.replace(/setOffer\(i, "delivery"/g, 'setOffer(i, "deliveryDays"');

// 5. Check if we need to fix the form in Admin to include 'url'
content = content.replace(
  /<input placeholder="Offer text" value=\{o\.paymentOffer\} onChange=\{\(e\) => setOffer\(i, "paymentOffer", e\.target\.value\)\} \/>/,
  \`<input placeholder="Offer text" value={o.paymentOffer} onChange={(e) => setOffer(i, "paymentOffer", e.target.value)} />
            <input placeholder="URL" value={o.url || ""} onChange={(e) => setOffer(i, "url", e.target.value)} />\`
);

// We also need to fix login and signup functions inside RelayApp
const loginReplacement = \`const res = await fetch(\`\\$\\{API\\}/auth/login\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: logEmail, password: logPass })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Login failed");
    } else {
      localStorage.setItem("relay:token", data.token);
      localStorage.setItem("relay:user", JSON.stringify(data.user));
      setUser(data.user);
      goto("catalog");
      const savedPrefs = await loadPrefs();
      setPrefs(savedPrefs);
      const myOrders = await loadOrders();
      setOrders(myOrders);
    }\`;

const signupReplacement = \`const res = await fetch(\`\\$\\{API\\}/auth/signup\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New User", email: logEmail, password: logPass })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Signup failed");
    } else {
      localStorage.setItem("relay:token", data.token);
      localStorage.setItem("relay:user", JSON.stringify(data.user));
      setUser(data.user);
      goto("catalog");
      setPrefs({ payment: "", chat: [] });
      setOrders([]);
    }\`;

content = content.replace(/const u = users\.find\(\(x\) => x\.email === logEmail && x\.password === logPass\);\s*if \(u\) \{[\s\S]*?\} else \{\s*alert\("Invalid credentials"\);\s*\}/, loginReplacement);

content = content.replace(/if \(users\.find\(\(x\) => x\.email === logEmail\)\) \{\s*alert\("Email already in use"\);\s*return;\s*\}\s*const nu = \{ name: "New User", email: logEmail, password: logPass, role: "User" \};\s*const updated = \[\.\.\.users, nu\];\s*setUsers\(updated\);\s*saveUsers\(updated\);\s*setUser\(nu\);\s*goto\("catalog"\);\s*setPrefs\(\{ payment: "", chat: \[\] \}\);\s*setOrders\(\[\]\);/, signupReplacement);

// Fix initial user load in useEffect
content = content.replace(/loadUsers\(\)\.then\(\(u\) => setUsers\(u\)\);/, \`const cachedUser = localStorage.getItem("relay:user");
    if (cachedUser) {
      const u = JSON.parse(cachedUser);
      setUser(u);
      loadPrefs().then(setPrefs);
      if (u.role === "Admin") loadAllOrders().then(setOrders);
      else loadOrders().then(setOrders);
    }\`);

// Admin initial load requires loading all orders
content = content.replace(/loadAllOrders\(users\)/g, 'loadAllOrders()');
content = content.replace(/loadOrders\(logEmail\)/g, 'loadOrders()');

// Chat interaction - replace rankOffers and handle backend integration if needed
// Actually, backend chat endpoint is separate, but we can keep client-side chat using 'ranked'

fs.writeFileSync(appPath, content);
console.log('App.jsx patched successfully');
