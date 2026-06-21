import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, ShoppingCart, User, MessageCircle, X, Check, ChevronRight,
  Star, ShieldCheck, ExternalLink, Plus, Trash2, Edit3, LogOut,
  Package, Menu, ArrowRight, Sparkles, Truck, BadgePercent, Send,
  LayoutGrid, ClipboardList, Award, RefreshCw, Box, Calendar, RotateCcw, Tag
} from "lucide-react";

/* ---------------------------------------------------------------
   RELAY — "we run the comparison, you take the last leg"
   Theme: Nova — a light, near-future storefront. Cool porcelain surfaces,
   an electric-violet→cyan gradient as the "AI" signal color, soft glass
   elevation instead of hard borders.
   Data: live product catalog + real photography pulled from a public
   commerce API (dummyjson.com) — no hardcoded product list anymore.
   Multi-platform prices are deterministically simulated from each real
   product's base price (clearly disclosed in the UI), since no public
   API exposes true live Amazon-vs-Flipkart pricing.
----------------------------------------------------------------*/

const API = "https://dummyjson.com";

const PLATFORMS = {
  Amazon: { color: "#FF9900", search: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  Flipkart: { color: "#2874F0", search: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
  Myntra: { color: "#FF3F6C", search: (q) => `https://www.myntra.com/${encodeURIComponent(q.replace(/ /g, "-"))}` },
  Croma: { color: "#00B0B9", search: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}` },
  "Reliance Digital": { color: "#E4032E", search: (q) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}` },
  Nykaa: { color: "#E32A6D", search: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}` },
};

const OFFER_TEXTS = {
  Amazon: ["10% instant discount on HDFC Credit Card", "5% cashback on Amazon Pay UPI", "No cost EMI up to 9 months", "Bank discount 5% on ICICI Credit Card"],
  Flipkart: ["₹2,000 off on Flipkart Axis Card", "Flipkart UPI 5% cashback", "No cost EMI up to 6 months", "Exchange bonus up to ₹5,000"],
  Myntra: ["Extra 10% off on Myntra Insider", "Extra 15% off for new users", "Flat 20% off on app orders"],
  Croma: ["Free installation, store pickup today", "Bank discount 10% on Axis Card", "Free 1 year extended warranty"],
  "Reliance Digital": ["No cost EMI up to 6 months", "Extra ₹500 off on exchange", "Bundle discount with accessories"],
  Nykaa: ["Buy 2 Get 1 Free on skincare", "Nykaa Prime 10% extra off", "Free gift on orders above ₹999"],
};

const FASHION_CATS = ["mens-shirts", "mens-shoes", "mens-watches", "tops", "womens-bags", "womens-dresses", "womens-jewellery", "womens-shoes", "womens-watches", "sunglasses"];
const BEAUTY_CATS = ["beauty", "skin-care", "fragrances"];

const PAYMENT_METHODS = ["HDFC Credit Card", "ICICI Credit Card", "SBI Credit Card", "Axis Credit Card", "Amazon Pay UPI", "Flipkart UPI", "Any UPI", "Cash on Delivery"];

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const titleCase = (s) => (s || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* deterministic pseudo-random so prices don't jitter between re-renders */
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function seededRand(seed) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

/* ---------------- transform a real API product into our comparison shape ---------------- */
function buildOffers(id, category, priceUSD, discountPct, stock) {
  const inrBase = Math.round((priceUSD * 83) / 10) * 10;
  const mrp = Math.round((inrBase * (1 + (discountPct || 8) / 100)) / 10) * 10;
  let platforms = ["Amazon", "Flipkart"];
  if (FASHION_CATS.includes(category)) platforms.push("Myntra");
  else if (BEAUTY_CATS.includes(category)) platforms.push("Nykaa");
  else platforms.push(hashStr(id) % 2 === 0 ? "Croma" : "Reliance Digital");

  return platforms.map((plat) => {
    const seed = hashStr(id + plat);
    const variance = (seededRand(seed) - 0.5) * 0.12;
    const price = Math.max(49, Math.round((inrBase * (1 + variance)) / 10) * 10);
    const delivery = Math.floor(seededRand(seed * 2 + 1) * 4);
    const pool = OFFER_TEXTS[plat];
    const offer = pool[Math.floor(seededRand(seed * 3 + 2) * pool.length)];
    const stockLabel = stock > 5 ? "In stock" : stock > 0 ? "Limited stock" : "Out of stock";
    return { platform: plat, price, mrp, delivery, offer, stock: stockLabel };
  });
}

function transformProduct(p) {
  const id = "api-" + p.id;
  return {
    id,
    name: p.title,
    category: p.category,
    categoryLabel: titleCase(p.category),
    blurb: (p.description || "").slice(0, 150),
    rating: p.rating || 4.0,
    image: (p.images && p.images[0]) || p.thumbnail || "",
    brand: p.brand || "Generic",
    sku: p.sku || "REL-" + p.id,
    weight: p.weight,
    dimensions: p.dimensions,
    warranty: p.warrantyInformation || "1 year manufacturer warranty",
    shipping: p.shippingInformation || "Ships in 2-3 business days",
    returnPolicy: p.returnPolicy || "30 days return policy",
    minOrderQty: p.minimumOrderQuantity || 1,
    offers: buildOffers(id, p.category, p.price, p.discountPercentage, p.stock ?? 10),
  };
}

const FALLBACK_PRODUCTS = [
  transformProduct({ id: "fb1", title: "Essential Wireless Earbuds", category: "smartphones", description: "Reliable everyday earbuds with solid battery life.", rating: 4.2, price: 25, discountPercentage: 10, stock: 12, brand: "Relay Basics", sku: "RB-EB1" }),
  transformProduct({ id: "fb2", title: "Everyday Laptop Backpack", category: "womens-bags", description: "Padded laptop compartment, water-resistant shell.", rating: 4.1, price: 18, discountPercentage: 12, stock: 9, brand: "Relay Basics", sku: "RB-BP1" }),
  transformProduct({ id: "fb3", title: "Compact Air Purifier", category: "home-decoration", description: "HEPA filtration for small to medium rooms.", rating: 4.0, price: 60, discountPercentage: 8, stock: 5, brand: "Relay Basics", sku: "RB-AP1" }),
];

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Request failed: " + r.status);
  return r.json();
}
async function fetchDefaultCatalog() {
  try { const data = await fetchJSON(`${API}/products?limit=30`); return data.products.map(transformProduct); }
  catch { return FALLBACK_PRODUCTS; }
}
async function fetchSearch(q) {
  try { const data = await fetchJSON(`${API}/products/search?q=${encodeURIComponent(q)}&limit=30`); return data.products.map(transformProduct); }
  catch { return []; }
}
async function fetchByCategory(slug) {
  try { const data = await fetchJSON(`${API}/products/category/${slug}`); return data.products.map(transformProduct); }
  catch { return []; }
}
async function fetchCategoryList() {
  try {
    const data = await fetchJSON(`${API}/products/categories`);
    return data.map((c) => (typeof c === "string" ? { slug: c, name: titleCase(c) } : { slug: c.slug, name: c.name }));
  } catch { return []; }
}

/* ---------------- AI verdict scoring ---------------- */
function scoreOffer(offer, preferredPayment) {
  const discountPct = (offer.mrp - offer.price) / offer.mrp;
  const deliveryScore = 1 - offer.delivery / 5;
  const paymentMatch = preferredPayment && offer.offer.toLowerCase().includes(preferredPayment.split(" ")[0].toLowerCase()) ? 1 : 0;
  const stockScore = offer.stock === "In stock" ? 1 : offer.stock === "Limited stock" ? 0.5 : 0;
  return discountPct * 0.45 + deliveryScore * 0.2 + paymentMatch * 0.25 + stockScore * 0.1;
}
function rankOffers(product, preferredPayment) {
  return [...product.offers].map((o) => ({ ...o, _score: scoreOffer(o, preferredPayment) })).sort((a, b) => b._score - a._score);
}

/* ---------------- storage helpers ---------------- */
async function loadCatalogOverride() {
  try { const res = await window.storage.get("relay:catalog-override", true); return res ? JSON.parse(res.value) : null; } catch { return null; }
}
async function saveCatalogOverride(products) {
  try { await window.storage.set("relay:catalog-override", JSON.stringify(products), true); } catch {}
}
async function clearCatalogOverride() {
  try { await window.storage.delete("relay:catalog-override", true); } catch {}
}
async function loadUsers() {
  try {
    const res = await window.storage.get("relay:users", true);
    return res ? JSON.parse(res.value) : [
      { name: "Admin", email: "admin@relay.app", password: "demo123", role: "Admin" },
      { name: "Lakshit", email: "user@relay.app", password: "demo123", role: "User" },
    ];
  } catch {
    return [
      { name: "Admin", email: "admin@relay.app", password: "demo123", role: "Admin" },
      { name: "Lakshit", email: "user@relay.app", password: "demo123", role: "User" },
    ];
  }
}
async function saveUsers(users) { try { await window.storage.set("relay:users", JSON.stringify(users), true); } catch {} }
async function loadOrders(email) { try { const res = await window.storage.get("relay:orders:" + email, false); return res ? JSON.parse(res.value) : []; } catch { return []; } }
async function saveOrders(email, orders) { try { await window.storage.set("relay:orders:" + email, JSON.stringify(orders), false); } catch {} }
async function loadAllOrders(users) {
  const all = [];
  for (const u of users) {
    try { const res = await window.storage.get("relay:orders:" + u.email, false); if (res) all.push(...JSON.parse(res.value).map((o) => ({ ...o, userEmail: u.email, userName: u.name }))); } catch {}
  }
  return all.sort((a, b) => b.ts - a.ts);
}
async function loadPrefs(email) { try { const res = await window.storage.get("relay:prefs:" + email, false); return res ? JSON.parse(res.value) : { payment: "", chat: [] }; } catch { return { payment: "", chat: [] }; } }
async function savePrefs(email, prefs) { try { await window.storage.set("relay:prefs:" + email, JSON.stringify(prefs), false); } catch {} }

/* ---------------- small UI atoms ---------------- */
function Toast({ toasts }) {
  return (
    <div className="rl-toast-wrap">
      {toasts.map((t) => <div key={t.id} className="rl-toast"><Check size={15} style={{ color: "var(--mint)", flexShrink: 0 }} /><span>{t.msg}</span></div>)}
    </div>
  );
}

function ProductImage({ src, alt, wrapClass, imgClass }) {
  const [error, setError] = useState(false);
  return (
    <div className={wrapClass}>
      {!error && src ? (
        <img src={src} alt={alt} loading="lazy" className={imgClass} onError={() => setError(true)} />
      ) : (
        <div className="rl-img-fallback"><Package size={28} /></div>
      )}
    </div>
  );
}

function VerdictTrack({ product, preferredPayment }) {
  const ranked = rankOffers(product, preferredPayment);
  const max = Math.max(...ranked.map((o) => o._score));
  return (
    <div className="rl-track">
      {ranked.map((o, i) => (
        <div key={o.platform} className={"rl-track-row" + (i === 0 ? " win" : "")} style={{ animationDelay: i * 90 + "ms" }}>
          <div className="rl-track-label"><span className="rl-dot" style={{ background: PLATFORMS[o.platform]?.color || "#888" }} />{o.platform}{i === 0 && <span className="rl-pill">AI pick</span>}</div>
          <div className="rl-track-bar-wrap"><div className={"rl-track-bar" + (i === 0 ? " win" : "")} style={{ width: (o._score / max) * 100 + "%" }} /></div>
          <div className="rl-track-price">{inr(o.price)}</div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rl-card rl-skel">
      <div className="rl-card-img rl-shimmer" />
      <div className="rl-card-right">
        <div className="rl-shimmer-line" style={{ width: "40%" }} />
        <div className="rl-shimmer-line" style={{ width: "80%", height: 16 }} />
        <div className="rl-shimmer-line" style={{ width: "95%" }} />
        <div className="rl-shimmer-line" style={{ width: "30%", marginTop: 10 }} />
      </div>
    </div>
  );
}

/* ---------------- main app ---------------- */
export default function RelayApp() {
  const [view, setView] = useState("landing");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [categoryList, setCategoryList] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [toasts, setToasts] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [prefs, setPrefs] = useState({ payment: "", chat: [] });
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [hasOverride, setHasOverride] = useState(false);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  // initial load: admin override (if any) else live API catalog, plus category list + users
  useEffect(() => {
    (async () => {
      const [override, cats, u] = await Promise.all([loadCatalogOverride(), fetchCategoryList(), loadUsers()]);
      setUsers(u);
      setCategoryList(cats);
      if (override) { setProducts(override); setHasOverride(true); setLoadingProducts(false); return; }
      const fresh = await fetchDefaultCatalog();
      setUsingFallback(fresh === FALLBACK_PRODUCTS);
      setProducts(fresh);
      setLoadingProducts(false);
    })();
  }, []);

  // debounced live search via API
  useEffect(() => {
    if (hasOverride) return; // admin has pinned a custom catalog, don't refetch over it
    const t = setTimeout(async () => {
      setLoadingProducts(true);
      let result;
      if (search.trim()) result = await fetchSearch(search.trim());
      else if (category !== "All") result = await fetchByCategory(category);
      else result = await fetchDefaultCatalog();
      setProducts(result);
      setLoadingProducts(false);
    }, search.trim() ? 420 : 0);
    return () => clearTimeout(t);
  }, [search, category, hasOverride]);

  const goto = (v) => { setView(v); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function handleLogin(email, password) {
    const e = email.trim().toLowerCase();
    const u = users.find((x) => x.email.toLowerCase() === e && x.password === password);
    if (!u) { pushToast("Invalid email or password"); return; }
    setUser(u); setLoginOpen(false);
    setPrefs(await loadPrefs(u.email));
    setOrders(await loadOrders(u.email));
    if (u.role === "Admin") setAllOrders(await loadAllOrders(users));
    pushToast("Welcome back, " + u.name);
    goto(u.role === "Admin" ? "admin" : "catalog");
  }
  async function handleSignup(name, email, password) {
    const e = email.trim().toLowerCase();
    if (!name || !e || !password) { pushToast("Fill in all fields"); return; }
    if (users.some((x) => x.email.toLowerCase() === e)) { pushToast("Account already exists"); return; }
    const nu = { name, email: e, password, role: "User" };
    const nuList = [...users, nu];
    setUsers(nuList); await saveUsers(nuList);
    setUser(nu); setLoginOpen(false);
    pushToast("Account created — welcome, " + name);
    goto("catalog");
  }
  function handleLogout() { setUser(null); setOrders([]); setPrefs({ payment: "", chat: [] }); goto("landing"); }

  function isInCart(id) { return cart.some((x) => x.id === id); }
  // FIX: previous version called pushToast() inside the setCart() updater function.
  // React may invoke state updaters more than once internally, so a side effect
  // living inside one fired the toast twice. Decide the action first, then do the
  // state update and the toast as two separate, single-fire steps.
  function toggleCart(product) {
    const already = isInCart(product.id);
    setCart((c) => (already ? c.filter((x) => x.id !== product.id) : [...c, product]));
    pushToast(already ? `${product.name} removed from compare cart` : `${product.name} added to compare cart`);
  }
  function removeFromCart(id) { setCart((c) => c.filter((x) => x.id !== id)); }

  async function redirectToBuy(product, offer) {
    const entry = { id: Date.now(), product: product.name, platform: offer.platform, price: offer.price, ts: Date.now(), status: "Redirected" };
    if (user) { const next = [entry, ...orders]; setOrders(next); await saveOrders(user.email, next); }
    pushToast("Redirecting to " + offer.platform + " to complete payment…");
    window.open(PLATFORMS[offer.platform]?.search(product.name) || "#", "_blank", "noopener,noreferrer");
  }

  async function savePaymentPref(method) {
    if (!user) { pushToast("Log in to save preferences"); return; }
    const next = { ...prefs, payment: method };
    setPrefs(next); await savePrefs(user.email, next);
    pushToast("Saved " + method + " as your preferred payment");
  }
  // FIX: chat history used to be persisted straight to storage from inside the
  // chat panel without updating the parent's `prefs` state, so reopening the
  // panel (or other components reading prefs.chat) could show stale history.
  async function updateChatHistory(nextChat) {
    const next = { ...prefs, chat: nextChat };
    setPrefs(next);
    if (user) await savePrefs(user.email, next);
  }

  async function adminSaveProduct(prod) {
    const next = products.some((p) => p.id === prod.id) ? products.map((p) => (p.id === prod.id ? prod : p)) : [...products, prod];
    setProducts(next); await saveCatalogOverride(next); setHasOverride(true);
    pushToast("Catalog updated");
  }
  async function adminDeleteProduct(id) {
    const next = products.filter((p) => p.id !== id);
    setProducts(next); await saveCatalogOverride(next); setHasOverride(true);
    pushToast("Product removed");
  }
  async function adminResetCatalog() {
    await clearCatalogOverride(); setHasOverride(false);
    setLoadingProducts(true);
    const fresh = await fetchDefaultCatalog();
    setProducts(fresh); setLoadingProducts(false); setCategory("All"); setSearch("");
    pushToast("Catalog refreshed from the live API");
  }

  const chips = useMemo(() => [{ slug: "All", name: "All" }, ...categoryList], [categoryList]);

  return (
    <div className="rl-root">
      <style>{CSS}</style>
      <Toast toasts={toasts} />

      <nav className="rl-nav">
        <div className="rl-nav-inner">
          <button className="rl-logo" onClick={() => goto("landing")}><span className="rl-logo-mark">R</span>elay</button>
          <div className={"rl-nav-links" + (navOpen ? " open" : "")}>
            <button onClick={() => goto("catalog")}>Catalog</button>
            <button onClick={() => goto("cart")}>Compare Cart {cart.length > 0 && <span className="rl-badge">{cart.length}</span>}</button>
            {user && user.role === "User" && <button onClick={() => goto("orders")}>My Orders</button>}
            {user && user.role === "Admin" && <button onClick={() => goto("admin")}>Admin</button>}
            {user ? <button onClick={handleLogout} className="rl-nav-cta"><LogOut size={15} /> Log out</button>
              : <button onClick={() => setLoginOpen(true)} className="rl-nav-cta"><User size={15} /> Log in</button>}
          </div>
          <button className="rl-burger" onClick={() => setNavOpen((o) => !o)}><Menu size={22} /></button>
        </div>
      </nav>

      {view === "landing" && <Landing goto={goto} products={products} loading={loadingProducts} />}
      {view === "catalog" && (
        <Catalog products={products} loading={loadingProducts} usingFallback={usingFallback} chips={chips} category={category} setCategory={setCategory}
          search={search} setSearch={setSearch} onOpen={(p) => { setSelected(p); goto("product"); }}
          onToggleCart={toggleCart} isInCart={isInCart} preferredPayment={prefs.payment} />
      )}
      {view === "product" && selected && (
        <ProductDetail product={selected} allProducts={products} preferredPayment={prefs.payment}
          onBack={() => goto("catalog")} onToggleCart={toggleCart} isInCart={isInCart} onBuy={redirectToBuy}
          onOpen={(p) => { setSelected(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      )}
      {view === "cart" && <CartView cart={cart} onRemove={removeFromCart} onBuy={redirectToBuy} preferredPayment={prefs.payment} goto={goto} />}
      {view === "orders" && user && <OrdersView orders={orders} />}
      {view === "admin" && user?.role === "Admin" && (
        <AdminView products={products} onSave={adminSaveProduct} onDelete={adminDeleteProduct} allOrders={allOrders}
          hasOverride={hasOverride} onReset={adminResetCatalog} loading={loadingProducts} />
      )}

      <footer className="rl-footer">
        <div>Relay pulls live product data &amp; real photography from a public commerce API, then simulates how each item would price across Amazon, Flipkart, Myntra, Croma, Reliance Digital &amp; Nykaa. It hands you off to pay on the original site — prices shown are illustrative, not scraped live listings.</div>
      </footer>

      {loginOpen && <AuthModal onClose={() => setLoginOpen(false)} onLogin={handleLogin} onSignup={handleSignup} />}

      <button className="rl-chat-fab" onClick={() => setChatOpen((o) => !o)}>{chatOpen ? <X size={22} /> : <MessageCircle size={22} />}</button>
      {chatOpen && <ChatPanel user={user} prefs={prefs} products={products} onSavePayment={savePaymentPref} onChatUpdate={updateChatHistory} />}
    </div>
  );
}

/* ---------------- Landing ---------------- */
function Landing({ goto, products, loading }) {
  const sample = products[0];
  return (
    <header className="rl-hero">
      <div className="rl-orb rl-orb-1" /><div className="rl-orb rl-orb-2" />
      <div className="rl-hero-grid">
        <div className="rl-hero-copy">
          <span className="rl-eyebrow"><Sparkles size={13} /> AI price verdicts, pulled from a live catalog</span>
          <h1>One search.<br />Every store.<br /><span className="rl-grad-text">One verdict.</span></h1>
          <p>Relay pulls real products and photography from a live catalog API, weighs price against delivery speed and your saved payment offers, then sends you to the original site to actually pay — no markup, no middleman checkout.</p>
          <div className="rl-hero-actions">
            <button className="rl-btn-primary" onClick={() => goto("catalog")}>Browse catalog <ArrowRight size={16} /></button>
            <button className="rl-btn-ghost" onClick={() => goto("catalog")}>See how the verdict works</button>
          </div>
          <div className="rl-hero-stats">
            <div><strong>Live</strong><span>catalog via API</span></div>
            <div><strong>0%</strong><span>markup — you pay the store</span></div>
            <div><strong>24/7</strong><span>chatbot price assistant</span></div>
          </div>
        </div>
        <div className="rl-hero-visual">
          {!loading && sample ? (
            <div className="rl-hero-card">
              <div className="rl-hero-card-top">
                <ProductImage src={sample.image} alt={sample.name} wrapClass="rl-hero-img-wrap" imgClass="rl-hero-img" />
                <div><div className="rl-hero-card-name">{sample.name}</div><div className="rl-hero-card-cat">{sample.categoryLabel}</div></div>
              </div>
              <VerdictTrack product={sample} preferredPayment="" />
            </div>
          ) : <div className="rl-hero-card rl-shimmer" style={{ height: 280 }} />}
        </div>
      </div>
    </header>
  );
}

/* ---------------- Catalog ---------------- */
function Catalog({ products, loading, usingFallback, chips, category, setCategory, search, setSearch, onOpen, onToggleCart, isInCart, preferredPayment }) {
  return (
    <main className="rl-section">
      <div className="rl-section-head">
        <h2>Catalog</h2>
        <div className="rl-search"><Search size={16} /><input placeholder="Search live catalog…" value={search} onChange={(e) => { setCategory("All"); setSearch(e.target.value); }} /></div>
      </div>
      {usingFallback && <div className="rl-banner"><RefreshCw size={14} /> Couldn't reach the live catalog API right now — showing a small offline sample.</div>}
      <div className="rl-chips">
        {chips.map((c) => <button key={c.slug} className={"rl-chip" + (c.slug === category ? " active" : "")} onClick={() => { setSearch(""); setCategory(c.slug); }}>{c.name}</button>)}
      </div>
      <div className="rl-list">
        {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && products.map((p, i) => {
          const best = rankOffers(p, preferredPayment)[0];
          const inCart = isInCart(p.id);
          return (
            <div key={p.id} className="rl-card" style={{ animationDelay: Math.min(i, 8) * 50 + "ms" }}>
              <div onClick={() => onOpen(p)} style={{ cursor: "pointer" }}>
                <ProductImage src={p.image} alt={p.name} wrapClass="rl-card-img" imgClass="rl-card-img-el" />
              </div>
              <div className="rl-card-right">
                <div onClick={() => onOpen(p)} style={{ cursor: "pointer" }}>
                  <div className="rl-card-cat">{p.categoryLabel} · {p.brand}</div>
                  <div className="rl-card-name">{p.name}</div>
                  <div className="rl-card-blurb">{p.blurb}</div>
                  <div className="rl-card-rating"><Star size={13} fill="#7C5CFF" stroke="none" /> {p.rating.toFixed ? p.rating.toFixed(1) : p.rating}</div>
                </div>
                <div className="rl-card-foot">
                  <div><span className="rl-card-price">{inr(best.price)}</span><span className="rl-card-mrp">{inr(best.mrp)}</span><div className="rl-card-from">best on {best.platform}</div></div>
                  <button className={"rl-cart-btn" + (inCart ? " active" : "")} onClick={(e) => { e.stopPropagation(); onToggleCart(p); }}>
                    {inCart ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add to cart</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && products.length === 0 && <div className="rl-empty">No products match that search.</div>}
      </div>
    </main>
  );
}

/* ---------------- Product Detail ---------------- */
function ProductDetail({ product, allProducts, preferredPayment, onBack, onToggleCart, isInCart, onBuy, onOpen }) {
  const ranked = rankOffers(product, preferredPayment);
  const best = ranked[0];
  const inCart = isInCart(product.id);
  const related = allProducts.filter((p) => p.category === product.category && p.id !== product.id);
  const more = (related.length > 0 ? related : allProducts.filter((p) => p.id !== product.id)).slice(0, 10);

  const specs = [
    { icon: Tag, label: "Brand", value: product.brand },
    { icon: Box, label: "SKU", value: product.sku },
    product.weight ? { icon: Package, label: "Weight", value: product.weight + "g" } : null,
    product.dimensions ? { icon: LayoutGrid, label: "Dimensions", value: `${product.dimensions.width}×${product.dimensions.height}×${product.dimensions.depth} cm` } : null,
    { icon: ShieldCheck, label: "Warranty", value: product.warranty },
    { icon: Truck, label: "Shipping", value: product.shipping },
    { icon: RotateCcw, label: "Returns", value: product.returnPolicy },
    { icon: Calendar, label: "Min. order qty", value: product.minOrderQty },
  ].filter(Boolean);

  return (
    <main className="rl-section rl-pd">
      <button className="rl-back" onClick={onBack}>← Back to catalog</button>
      <div className="rl-pd-grid">
        <div className="rl-pd-visual">
          <ProductImage src={product.image} alt={product.name} wrapClass="rl-pd-img-wrap" imgClass="rl-pd-img" />
          <div className="rl-pd-savings"><BadgePercent size={15} /> Save up to {Math.round(((product.offers[0].mrp - best.price) / product.offers[0].mrp) * 100)}% vs MRP {inr(product.offers[0].mrp)}</div>
        </div>
        <div className="rl-pd-info">
          <div className="rl-card-cat">{product.categoryLabel} · {product.brand}</div>
          <h2>{product.name}</h2>
          <div className="rl-card-rating"><Star size={14} fill="#7C5CFF" stroke="none" /> {product.rating} rating</div>
          <p className="rl-pd-blurb">{product.blurb}</p>

          <div className="rl-verdict-box">
            <div className="rl-verdict-head"><Award size={16} /> AI verdict</div>
            <p><strong>{best.platform}</strong> is your best option at <strong>{inr(best.price)}</strong> — {best.delivery === 0 ? "store pickup today" : `delivery in ${best.delivery} day${best.delivery > 1 ? "s" : ""}`}, {best.offer.toLowerCase()}{preferredPayment ? `. Matched against your saved ${preferredPayment}.` : "."}</p>
          </div>

          <VerdictTrack product={product} preferredPayment={preferredPayment} />

          <div className="rl-offer-list">
            {ranked.map((o) => (
              <div key={o.platform} className="rl-offer-row">
                <div className="rl-offer-left">
                  <span className="rl-dot" style={{ background: PLATFORMS[o.platform]?.color }} />
                  <div><div className="rl-offer-platform">{o.platform}</div><div className="rl-offer-meta"><Truck size={12} /> {o.delivery === 0 ? "Today" : o.delivery + "d"} · {o.stock}</div><div className="rl-offer-meta">{o.offer}</div></div>
                </div>
                <div className="rl-offer-right"><div className="rl-offer-price">{inr(o.price)}</div><div className="rl-offer-mrp">{inr(o.mrp)}</div>
                  <button className="rl-btn-mini" onClick={() => onBuy(product, o)}>Buy on {o.platform} <ExternalLink size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <button className={"rl-btn-ghost" + (inCart ? " active" : "")} style={{ marginTop: 14 }} onClick={() => onToggleCart(product)}>
            {inCart ? <><Check size={15} /> In compare cart</> : <><ShoppingCart size={15} /> Add to compare cart</>}
          </button>

          <div className="rl-specs">
            <h3>Specifications</h3>
            <div className="rl-specs-grid">
              {specs.map((s, i) => (
                <div key={i} className="rl-spec-row"><s.icon size={15} className="rl-spec-icon" /><div><div className="rl-spec-label">{s.label}</div><div className="rl-spec-value">{s.value}</div></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {more.length > 0 && (
        <div className="rl-related">
          <h3>Related products</h3>
          <div className="rl-related-scroll">
            {more.map((p) => {
              const b = rankOffers(p, preferredPayment)[0];
              return (
                <button key={p.id} className="rl-related-card" onClick={() => onOpen(p)}>
                  <ProductImage src={p.image} alt={p.name} wrapClass="rl-related-img-wrap" imgClass="rl-related-img-el" />
                  <div className="rl-related-name">{p.name}</div>
                  <div className="rl-related-price">{inr(b.price)}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------- Cart ---------------- */
function CartView({ cart, onRemove, onBuy, preferredPayment, goto }) {
  if (cart.length === 0) {
    return (
      <main className="rl-section rl-empty-state">
        <Package size={36} /><h3>Your compare cart is empty</h3><p>Add products from the catalog to line them up side by side.</p>
        <button className="rl-btn-primary" onClick={() => goto("catalog")}>Browse catalog</button>
      </main>
    );
  }
  const total = cart.reduce((sum, p) => sum + rankOffers(p, preferredPayment)[0].price, 0);
  return (
    <main className="rl-section">
      <h2>Compare cart</h2>
      <div className="rl-cart-list">
        {cart.map((p) => {
          const best = rankOffers(p, preferredPayment)[0];
          return (
            <div key={p.id} className="rl-cart-row">
              <ProductImage src={p.image} alt={p.name} wrapClass="rl-cart-img-wrap" imgClass="rl-cart-img-el" />
              <div className="rl-cart-info"><div className="rl-card-name">{p.name}</div><div className="rl-offer-meta">Best: {best.platform} · {inr(best.price)}</div></div>
              <button className="rl-btn-mini" onClick={() => onBuy(p, best)}>Buy on {best.platform} <ExternalLink size={12} /></button>
              <button className="rl-icon-btn danger" onClick={() => onRemove(p.id)}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
      <div className="rl-cart-total"><span>Total across best picks</span><strong>{inr(total)}</strong></div>
      <p className="rl-offer-meta">Checkout happens on each store individually — Relay never takes your payment details.</p>
    </main>
  );
}

/* ---------------- Orders ---------------- */
function OrdersView({ orders }) {
  return (
    <main className="rl-section">
      <h2>My orders</h2>
      {orders.length === 0 && <div className="rl-empty">No redirects yet — buy something from the catalog to see it tracked here.</div>}
      <div className="rl-orders-list">
        {orders.map((o) => (
          <div key={o.id} className="rl-order-row"><div><div className="rl-card-name">{o.product}</div><div className="rl-offer-meta">via {o.platform} · {inr(o.price)} · {new Date(o.ts).toLocaleString()}</div></div><span className="rl-status">{o.status}</span></div>
        ))}
      </div>
    </main>
  );
}

/* ---------------- Admin ---------------- */
function AdminView({ products, onSave, onDelete, allOrders, hasOverride, onReset, loading }) {
  const [tab, setTab] = useState("products");
  const [editing, setEditing] = useState(null);
  function blank() {
    return { id: "custom-" + Date.now(), name: "", category: "home-decoration", categoryLabel: "Home Decoration", image: "", brand: "", sku: "", warranty: "1 year warranty", shipping: "Ships in 2-3 days", returnPolicy: "30 days return", minOrderQty: 1, rating: 4.0, blurb: "",
      offers: [{ platform: "Amazon", price: 0, mrp: 0, delivery: 2, offer: "", stock: "In stock" }] };
  }
  return (
    <main className="rl-section">
      <div className="rl-section-head"><h2>Admin console</h2>
        {hasOverride && <button className="rl-btn-ghost" onClick={onReset} disabled={loading}><RefreshCw size={14} /> Refresh catalog from live API</button>}
      </div>
      <div className="rl-chips">
        <button className={"rl-chip" + (tab === "products" ? " active" : "")} onClick={() => setTab("products")}><LayoutGrid size={13} /> Products</button>
        <button className={"rl-chip" + (tab === "orders" ? " active" : "")} onClick={() => setTab("orders")}><ClipboardList size={13} /> Order tracking</button>
      </div>
      {tab === "products" && (
        <>
          <button className="rl-btn-primary" style={{ marginBottom: 16 }} onClick={() => setEditing(blank())}><Plus size={15} /> Add product</button>
          <div className="rl-admin-table">
            {products.map((p) => (
              <div key={p.id} className="rl-admin-row">
                <ProductImage src={p.image} alt={p.name} wrapClass="rl-admin-img-wrap" imgClass="rl-admin-img-el" />
                <div className="rl-cart-info"><div className="rl-card-name">{p.name}</div><div className="rl-offer-meta">{p.categoryLabel} · {p.offers.length} platform offers</div></div>
                <button className="rl-icon-btn" onClick={() => setEditing(p)}><Edit3 size={15} /></button>
                <button className="rl-icon-btn danger" onClick={() => onDelete(p.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "orders" && (
        <div className="rl-orders-list">
          {allOrders.length === 0 && <div className="rl-empty">No customer redirects logged yet.</div>}
          {allOrders.map((o) => (
            <div key={o.id + o.userEmail} className="rl-order-row"><div><div className="rl-card-name">{o.product}</div><div className="rl-offer-meta">{o.userName} ({o.userEmail}) · via {o.platform} · {inr(o.price)}</div></div><span className="rl-status">{o.status}</span></div>
          ))}
        </div>
      )}
      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSave={(p) => { onSave(p); setEditing(null); }} />}
    </main>
  );
}

function ProductEditor({ product, onClose, onSave }) {
  const [form, setForm] = useState(product);
  const setOffer = (i, field, val) => setForm({ ...form, offers: form.offers.map((o, idx) => idx === i ? { ...o, [field]: val } : o) });
  return (
    <div className="rl-modal-backdrop" onClick={onClose}>
      <div className="rl-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rl-modal-close" onClick={onClose}><X size={18} /></button>
        <h3>{product.name ? "Edit product" : "New product"}</h3>
        <div className="rl-form-grid">
          <input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input placeholder="Category label" value={form.categoryLabel} onChange={(e) => setForm({ ...form, categoryLabel: e.target.value, category: e.target.value.toLowerCase().replace(/ /g, "-") })} />
          <input placeholder="Rating" type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} />
        </div>
        <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} style={{ marginTop: 8 }} />
        <textarea placeholder="Short description" value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} />
        <div className="rl-offer-head">Platform offers</div>
        {form.offers.map((o, i) => (
          <div key={i} className="rl-offer-form-row">
            <select value={o.platform} onChange={(e) => setOffer(i, "platform", e.target.value)}>{Object.keys(PLATFORMS).map((pl) => <option key={pl} value={pl}>{pl}</option>)}</select>
            <input placeholder="Price" type="number" value={o.price} onChange={(e) => setOffer(i, "price", parseInt(e.target.value) || 0)} />
            <input placeholder="MRP" type="number" value={o.mrp} onChange={(e) => setOffer(i, "mrp", parseInt(e.target.value) || 0)} />
            <input placeholder="Delivery days" type="number" value={o.delivery} onChange={(e) => setOffer(i, "delivery", parseInt(e.target.value) || 0)} />
            <input placeholder="Offer text" value={o.offer} onChange={(e) => setOffer(i, "offer", e.target.value)} />
          </div>
        ))}
        <button className="rl-btn-ghost" onClick={() => setForm({ ...form, offers: [...form.offers, { platform: "Amazon", price: 0, mrp: 0, delivery: 2, offer: "", stock: "In stock" }] })}><Plus size={14} /> Add platform offer</button>
        <button className="rl-btn-primary" style={{ marginTop: 14 }} onClick={() => onSave(form)}>Save product</button>
      </div>
    </div>
  );
}

/* ---------------- Auth modal ---------------- */
function AuthModal({ onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="rl-modal-backdrop" onClick={onClose}>
      <div className="rl-modal rl-auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rl-modal-close" onClick={onClose}><X size={18} /></button>
        <h3>{mode === "login" ? "Log in to Relay" : "Create your account"}</h3>
        <p className="rl-offer-meta">Demo accounts — admin@relay.app / user@relay.app, password demo123</p>
        {mode === "signup" && <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="rl-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => mode === "login" ? onLogin(email, password) : onSignup(name, email, password)}>{mode === "login" ? "Log in" : "Sign up"}</button>
        <button className="rl-link-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button>
      </div>
    </div>
  );
}

/* ---------------- Chatbot ---------------- */
function ChatPanel({ user, prefs, products, onSavePayment, onChatUpdate }) {
  const [messages, setMessages] = useState(prefs.chat?.length ? prefs.chat : [{ from: "bot", text: "Hi! I'm Relay's assistant. Tell me a product to compare, or say \"remember my payment is HDFC Credit Card\" and I'll factor that into every verdict." }]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function reply(text) {
    const lower = text.toLowerCase();
    const matchedMethod = PAYMENT_METHODS.find((m) => lower.includes(m.toLowerCase().split(" ")[0]));
    if (lower.includes("remember") || (lower.includes("payment") && matchedMethod)) {
      if (matchedMethod) { onSavePayment(matchedMethod); return `Got it — I'll prioritize offers matching ${matchedMethod} in every verdict from now on.`; }
      return "Which payment method should I remember? Try one of: " + PAYMENT_METHODS.slice(0, 4).join(", ") + "…";
    }
    // FIX: previously matched on just the first word of a product name, which could
    // false-positive on short common words. Now requires a distinctive (4+ char) word match.
    const found = products.find((p) => p.name.toLowerCase().split(" ").some((w) => w.length > 3 && lower.includes(w)));
    if (found) {
      const best = rankOffers(found, prefs.payment)[0];
      return `For ${found.name}, my pick is ${best.platform} at ${inr(best.price)} (${best.offer.toLowerCase()}). Open the product page to see the full comparison and buy.`;
    }
    if (lower.includes("hi") || lower.includes("hello")) return "Hey! Ask me to compare any product from the catalog.";
    return "I can compare prices, delivery, and offers across stores — name a product, or tell me your preferred payment method to personalize results.";
  }

  function send() {
    if (!input.trim()) return;
    const next = [...messages, { from: "user", text: input }, { from: "bot", text: reply(input) }];
    setMessages(next); setInput("");
    onChatUpdate(next);
  }

  return (
    <div className="rl-chat-panel">
      <div className="rl-chat-head"><div><strong>Relay Assistant</strong><div className="rl-offer-meta">{prefs.payment ? "Remembering: " + prefs.payment : "No saved payment yet"}</div></div></div>
      <div className="rl-chat-body">{messages.map((m, i) => <div key={i} className={"rl-chat-msg " + m.from}>{m.text}</div>)}<div ref={endRef} /></div>
      <div className="rl-chat-input"><input placeholder="Ask about a product…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} /><button onClick={send}><Send size={15} /></button></div>
      {!user && <div className="rl-chat-hint">Log in to save your payment preference across visits.</div>}
    </div>
  );
}

/* ---------------- CSS ---------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
:root{ --bg:#F5F6FC; --surface:#FFFFFF; --surface-soft:#EEF0FA; --line:#E3E6F3; --ink:#13162B; --muted:#6B7290; --primary:#7C5CFF; --primary2:#22C7E0; --mint:#00B894; --coral:#FF5D7A; }
*{box-sizing:border-box;}
.rl-root{ font-family:'Inter',-apple-system,system-ui,sans-serif; background:var(--bg); color:var(--ink); min-height:100vh; }
.rl-grad-text{ background:linear-gradient(100deg,var(--primary),var(--primary2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
h1,h2,h3{ font-family:'Space Grotesk',sans-serif; margin:0; font-weight:600; }

/* nav */
.rl-nav{ position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.82); backdrop-filter:blur(14px); border-bottom:1px solid var(--line); }
.rl-nav-inner{ max-width:1180px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:14px 20px; }
.rl-logo{ background:none; border:none; color:var(--ink); font-family:'Space Grotesk',serif; font-size:22px; cursor:pointer; display:flex; align-items:center; gap:2px; font-weight:700; }
.rl-logo-mark{ background:linear-gradient(135deg,var(--primary),var(--primary2)); color:#fff; width:26px; height:26px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; font-size:15px; margin-right:6px; font-weight:800; }
.rl-nav-links{ display:flex; align-items:center; gap:22px; }
.rl-nav-links button{ background:none; border:none; color:var(--ink); font-size:14.5px; cursor:pointer; display:flex; align-items:center; gap:6px; opacity:.85; transition:opacity .2s,color .2s; }
.rl-nav-links button:hover{ opacity:1; color:var(--primary); }
.rl-nav-cta{ background:linear-gradient(120deg,var(--primary),var(--primary2))!important; color:#fff!important; padding:9px 16px; border-radius:9px; font-weight:700; opacity:1!important; box-shadow:0 8px 18px -8px rgba(124,92,255,.5); }
.rl-burger{ display:none; background:none; border:none; color:var(--ink); }
.rl-badge{ background:var(--primary); color:#fff; font-size:11px; padding:1px 6px; border-radius:10px; font-weight:700; }

/* hero */
.rl-hero{ max-width:1180px; margin:0 auto; padding:64px 20px 40px; position:relative; overflow:hidden; }
.rl-orb{ position:absolute; border-radius:50%; filter:blur(60px); opacity:.35; z-index:0; pointer-events:none; }
.rl-orb-1{ width:340px; height:340px; background:var(--primary); top:-120px; right:-60px; animation: rl-drift 12s ease-in-out infinite; }
.rl-orb-2{ width:260px; height:260px; background:var(--primary2); bottom:-80px; left:10%; animation: rl-drift 14s ease-in-out infinite reverse; }
@keyframes rl-drift{ 0%,100%{ transform:translate(0,0);} 50%{ transform:translate(20px,30px);} }
.rl-hero-grid{ display:grid; grid-template-columns:1.1fr .9fr; gap:48px; align-items:center; position:relative; z-index:1; }
.rl-eyebrow{ display:inline-flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--line); padding:6px 12px; border-radius:20px; font-size:12.5px; color:var(--primary); animation: rl-fade-up .6s ease both; box-shadow:0 4px 14px -8px rgba(20,20,50,.15); }
.rl-hero-copy h1{ font-size:54px; line-height:1.06; margin:18px 0 18px; animation: rl-fade-up .7s .1s ease both; letter-spacing:-1px; }
.rl-hero-copy p{ color:var(--muted); font-size:16.5px; line-height:1.6; max-width:480px; animation: rl-fade-up .7s .2s ease both; }
.rl-hero-actions{ display:flex; gap:14px; margin:26px 0 36px; flex-wrap:wrap; animation: rl-fade-up .7s .3s ease both; }
.rl-hero-stats{ display:flex; gap:36px; animation: rl-fade-up .7s .4s ease both; }
.rl-hero-stats strong{ font-family:'JetBrains Mono',monospace; font-size:21px; display:block; color:var(--primary); }
.rl-hero-stats span{ font-size:12px; color:var(--muted); }
.rl-hero-visual{ animation: rl-fade-in .9s .2s ease both; }
.rl-hero-card{ background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:22px; box-shadow:0 30px 60px -24px rgba(40,40,90,.25); }
.rl-hero-card-top{ display:flex; align-items:center; gap:12px; margin-bottom:18px; }
.rl-hero-img-wrap{ width:52px; height:52px; border-radius:13px; overflow:hidden; background:var(--surface-soft); flex-shrink:0; }
.rl-hero-img{ width:100%; height:100%; object-fit:cover; }
.rl-hero-card-name{ font-weight:700; }
.rl-hero-card-cat{ font-size:12px; color:var(--muted); }

@keyframes rl-fade-up{ from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:none;} }
@keyframes rl-fade-in{ from{opacity:0;} to{opacity:1;} }

/* image wrappers / fallback */
.rl-img-fallback{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--muted); background:var(--surface-soft); }

/* buttons */
.rl-btn-primary{ background:linear-gradient(120deg,var(--primary),var(--primary2)); color:#fff; border:none; padding:12px 20px; border-radius:10px; font-weight:700; font-size:14.5px; display:inline-flex; align-items:center; gap:8px; cursor:pointer; transition:transform .15s, box-shadow .15s; }
.rl-btn-primary:hover{ transform:translateY(-2px); box-shadow:0 14px 28px -10px rgba(124,92,255,.5); }
.rl-btn-ghost{ background:var(--surface); color:var(--ink); border:1px solid var(--line); padding:11px 18px; border-radius:10px; font-size:14.5px; display:inline-flex; align-items:center; gap:8px; cursor:pointer; transition:border-color .2s, color .2s, box-shadow .2s; box-shadow:0 4px 14px -10px rgba(20,20,50,.15); }
.rl-btn-ghost:hover{ border-color:var(--primary); color:var(--primary); box-shadow:0 8px 20px -10px rgba(124,92,255,.3); }
.rl-btn-ghost.active{ border-color:var(--mint); color:var(--mint); }
.rl-btn-mini{ background:var(--surface-soft); border:1px solid var(--line); color:var(--ink); font-size:12.5px; padding:7px 11px; border-radius:7px; display:inline-flex; align-items:center; gap:5px; cursor:pointer; white-space:nowrap; transition:all .2s; }
.rl-btn-mini:hover{ border-color:var(--primary); color:var(--primary); background:#fff; }
.rl-icon-btn{ background:var(--surface-soft); border:1px solid var(--line); color:var(--ink); width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .15s,border-color .2s,color .2s; flex-shrink:0; }
.rl-icon-btn:hover{ transform:scale(1.08); border-color:var(--primary); color:var(--primary); }
.rl-icon-btn.danger:hover{ border-color:var(--coral); color:var(--coral); }
.rl-link-btn{ background:none; border:none; color:var(--muted); font-size:13px; text-decoration:underline; cursor:pointer; margin-top:12px; }
.rl-cart-btn{ background:var(--surface-soft); border:1px solid var(--line); color:var(--ink); font-size:12.5px; font-weight:700; padding:8px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; transition:all .2s; white-space:nowrap; }
.rl-cart-btn:hover{ border-color:var(--primary); color:var(--primary); }
.rl-cart-btn.active{ background:rgba(0,184,148,.12); border-color:var(--mint); color:var(--mint); }

/* sections */
.rl-section{ max-width:1180px; margin:0 auto; padding:40px 20px 60px; animation: rl-fade-up .5s ease both; }
.rl-section-head{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
.rl-search{ display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); padding:9px 14px; border-radius:10px; min-width:240px; box-shadow:0 4px 14px -10px rgba(20,20,50,.15); }
.rl-search input{ background:none; border:none; outline:none; color:var(--ink); font-size:14px; width:100%; }
.rl-banner{ display:flex; align-items:center; gap:8px; background:#FFF6E5; border:1px solid #F4D98E; color:#92670B; padding:10px 14px; border-radius:10px; font-size:12.5px; margin-bottom:16px; }
.rl-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
.rl-chip{ background:var(--surface); border:1px solid var(--line); color:var(--muted); padding:7px 14px; border-radius:20px; font-size:13px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all .2s; }
.rl-chip.active{ background:linear-gradient(120deg,var(--primary),var(--primary2)); border-color:transparent; color:#fff; font-weight:700; }

/* Amazon/Flipkart-style horizontal list cards */
.rl-list{ display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
.rl-card{ background:var(--surface); border:1px solid var(--line); border-radius:16px; overflow:hidden; display:flex; animation: rl-fade-up .5s ease both; transition:transform .2s, box-shadow .2s, border-color .2s; }
.rl-card:hover{ transform:translateY(-4px); box-shadow:0 20px 38px -18px rgba(40,40,90,.25); border-color:#D7DCF2; }
.rl-card-img{ width:130px; flex-shrink:0; overflow:hidden; background:var(--surface-soft); position:relative; }
.rl-card-img-el{ width:100%; height:100%; object-fit:cover; transition:transform .45s cubic-bezier(.2,.8,.2,1); display:block; }
.rl-card:hover .rl-card-img-el{ transform:scale(1.14); }
.rl-card-right{ flex:1; padding:14px 16px; display:flex; flex-direction:column; justify-content:space-between; min-width:0; }
.rl-card-cat{ font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.rl-card-name{ font-weight:700; font-size:15px; margin:3px 0 4px; line-height:1.3; }
.rl-card-blurb{ font-size:12px; color:var(--muted); line-height:1.4; }
.rl-card-rating{ display:flex; align-items:center; gap:4px; font-size:12px; color:var(--primary); margin-top:6px; font-weight:600; }
.rl-card-foot{ display:flex; align-items:flex-end; justify-content:space-between; margin-top:10px; gap:10px; }
.rl-card-price{ font-weight:800; font-size:16px; font-family:'JetBrains Mono',monospace; }
.rl-card-mrp{ font-size:11px; color:var(--muted); text-decoration:line-through; margin-left:6px; }
.rl-card-from{ font-size:10.5px; color:var(--mint); margin-top:2px; font-weight:600; }
.rl-empty{ color:var(--muted); padding:40px; text-align:center; grid-column:1/-1; }

/* skeleton loaders */
.rl-skel{ pointer-events:none; }
.rl-shimmer, .rl-shimmer-line{ position:relative; overflow:hidden; background:var(--surface-soft); border-radius:6px; }
.rl-shimmer-line{ height:11px; margin:8px 0; }
.rl-shimmer::after, .rl-shimmer-line::after{ content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(124,92,255,.13),transparent); animation: rl-shimmer-sweep 1.4s infinite; }
@keyframes rl-shimmer-sweep{ from{ transform:translateX(-100%);} to{ transform:translateX(100%);} }

/* verdict track */
.rl-track{ display:flex; flex-direction:column; gap:9px; margin:18px 0; }
.rl-track-row{ display:grid; grid-template-columns:150px 1fr 80px; align-items:center; gap:10px; animation: rl-slide-in .5s ease both; }
@keyframes rl-slide-in{ from{opacity:0; transform:translateX(-10px);} to{opacity:1; transform:none;} }
.rl-track-label{ font-size:12.5px; display:flex; align-items:center; gap:6px; color:var(--muted); }
.rl-track-row.win .rl-track-label{ color:var(--ink); font-weight:700; }
.rl-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.rl-pill{ background:linear-gradient(120deg,var(--primary),var(--primary2)); color:#fff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:8px; }
.rl-track-bar-wrap{ height:8px; background:var(--surface-soft); border-radius:6px; overflow:hidden; }
.rl-track-bar{ height:100%; border-radius:6px; background:var(--muted); animation: rl-grow-bar 1s cubic-bezier(.2,.8,.2,1) both; }
.rl-track-bar.win{ background:linear-gradient(90deg,var(--primary),var(--primary2)); }
@keyframes rl-grow-bar{ from{width:0!important;} }
.rl-track-price{ font-size:13px; font-weight:700; text-align:right; font-family:'JetBrains Mono',monospace; }

/* product detail */
.rl-pd-grid{ display:grid; grid-template-columns:.75fr 1.25fr; gap:40px; margin-top:18px; }
.rl-back{ background:none; border:none; color:var(--muted); cursor:pointer; font-size:13.5px; }
.rl-pd-visual{ background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:30px; display:flex; flex-direction:column; align-items:center; gap:20px; height:fit-content; }
.rl-pd-img-wrap{ width:100%; aspect-ratio:1/1; border-radius:16px; overflow:hidden; background:var(--surface-soft); }
.rl-pd-img{ width:100%; height:100%; object-fit:cover; transition:transform .4s; }
.rl-pd-visual:hover .rl-pd-img{ transform:scale(1.05); }
.rl-pd-savings{ display:flex; align-items:center; gap:6px; background:rgba(0,184,148,.1); color:var(--mint); padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; text-align:center; }
.rl-pd-info h2{ font-size:30px; margin:6px 0 10px; }
.rl-pd-blurb{ color:var(--muted); margin:10px 0 18px; line-height:1.6; }
.rl-verdict-box{ background:linear-gradient(120deg,rgba(124,92,255,.08),rgba(34,199,224,.06)); border:1px solid #DCD4FF; border-radius:14px; padding:16px 18px; margin-bottom:18px; }
.rl-verdict-head{ display:flex; align-items:center; gap:7px; font-weight:700; color:var(--primary); margin-bottom:6px; font-size:13.5px; }
.rl-verdict-box p{ font-size:13.5px; line-height:1.6; margin:0; color:#2A2D44; }
.rl-offer-list{ display:flex; flex-direction:column; gap:10px; margin-top:8px; }
.rl-offer-row{ display:flex; align-items:center; justify-content:space-between; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:14px 16px; gap:14px; transition:border-color .2s, box-shadow .2s; }
.rl-offer-row:hover{ border-color:#C9CFEE; box-shadow:0 10px 24px -16px rgba(40,40,90,.25); }
.rl-offer-left{ display:flex; align-items:center; gap:12px; }
.rl-offer-platform{ font-weight:700; font-size:14.5px; }
.rl-offer-meta{ font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:4px; margin-top:2px; }
.rl-offer-right{ text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.rl-offer-price{ font-weight:800; font-size:15px; font-family:'JetBrains Mono',monospace; }
.rl-offer-mrp{ font-size:11.5px; color:var(--muted); text-decoration:line-through; }

/* specs */
.rl-specs{ margin-top:30px; }
.rl-specs h3{ font-size:18px; margin-bottom:12px; }
.rl-specs-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.rl-spec-row{ display:flex; align-items:flex-start; gap:10px; background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
.rl-spec-icon{ color:var(--primary); margin-top:2px; flex-shrink:0; }
.rl-spec-label{ font-size:10.5px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
.rl-spec-value{ font-size:13px; font-weight:600; }

/* related products — horizontal scroller */
.rl-related{ margin-top:48px; }
.rl-related h3{ font-size:20px; margin-bottom:14px; }
.rl-related-scroll{ display:flex; gap:14px; overflow-x:auto; padding-bottom:10px; scroll-snap-type:x mandatory; }
.rl-related-scroll::-webkit-scrollbar{ height:8px; }
.rl-related-scroll::-webkit-scrollbar-track{ background:var(--surface-soft); border-radius:8px; }
.rl-related-scroll::-webkit-scrollbar-thumb{ background:#C9CFEE; border-radius:8px; }
.rl-related-scroll::-webkit-scrollbar-thumb:hover{ background:var(--primary); }
.rl-related-card{ flex:0 0 150px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; scroll-snap-align:start; transition:transform .2s, border-color .2s, box-shadow .2s; }
.rl-related-card:hover{ transform:translateY(-4px); border-color:var(--primary); box-shadow:0 14px 26px -16px rgba(40,40,90,.25); }
.rl-related-img-wrap{ width:100%; height:90px; border-radius:10px; overflow:hidden; background:var(--surface-soft); }
.rl-related-img-el{ width:100%; height:100%; object-fit:cover; transition:transform .4s; }
.rl-related-card:hover .rl-related-img-el{ transform:scale(1.12); }
.rl-related-name{ font-size:12px; font-weight:600; text-align:center; line-height:1.3; min-height:31px; }
.rl-related-price{ font-size:13px; font-weight:800; color:var(--mint); font-family:'JetBrains Mono',monospace; }

/* cart */
.rl-cart-list{ display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
.rl-cart-row{ display:flex; align-items:center; gap:14px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px 16px; }
.rl-cart-img-wrap{ width:46px; height:46px; border-radius:10px; overflow:hidden; flex-shrink:0; background:var(--surface-soft); }
.rl-cart-img-el{ width:100%; height:100%; object-fit:cover; }
.rl-cart-info{ flex:1; min-width:0; }
.rl-cart-total{ display:flex; justify-content:space-between; padding:16px 0; border-top:1px solid var(--line); font-size:16px; margin-bottom:6px; font-family:'JetBrains Mono',monospace; }
.rl-empty-state{ text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px; color:var(--muted); padding:80px 20px; }

/* orders / admin */
.rl-orders-list, .rl-admin-table{ display:flex; flex-direction:column; gap:10px; }
.rl-order-row, .rl-admin-row{ display:flex; align-items:center; gap:14px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px 16px; }
.rl-admin-img-wrap{ width:40px; height:40px; border-radius:9px; overflow:hidden; flex-shrink:0; background:var(--surface-soft); }
.rl-admin-img-el{ width:100%; height:100%; object-fit:cover; }
.rl-status{ background:rgba(0,184,148,.12); color:var(--mint); font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:14px; }

/* modal */
.rl-modal-backdrop{ position:fixed; inset:0; background:rgba(20,20,40,.35); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:300; padding:20px; animation: rl-fade-in .2s ease both; }
.rl-modal{ background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:28px; width:100%; max-width:480px; max-height:86vh; overflow-y:auto; position:relative; animation: rl-pop .25s ease both; box-shadow:0 40px 80px -20px rgba(20,20,50,.35); }
@keyframes rl-pop{ from{opacity:0; transform:scale(.95);} to{opacity:1; transform:none;} }
.rl-modal-close{ position:absolute; top:16px; right:16px; background:none; border:none; color:var(--muted); cursor:pointer; }
.rl-modal h3{ margin-bottom:6px; }
.rl-modal input, .rl-modal select, .rl-modal textarea{ width:100%; background:var(--surface-soft); border:1px solid var(--line); color:var(--ink); padding:10px 12px; border-radius:9px; font-size:13.5px; margin-top:8px; font-family:inherit; }
.rl-form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.rl-offer-head{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin:18px 0 4px; }
.rl-offer-form-row{ display:grid; grid-template-columns:1fr 70px 70px 60px 1.4fr; gap:6px; margin-bottom:6px; }

/* toast */
.rl-toast-wrap{ position:fixed; top:16px; right:16px; z-index:200; display:flex; flex-direction:column; gap:8px; }
.rl-toast{ background:var(--surface); border:1px solid var(--line); padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:8px; font-size:13px; box-shadow:0 16px 30px -14px rgba(20,20,50,.3); animation: rl-fade-up .3s ease both; }

/* footer */
.rl-footer{ border-top:1px solid var(--line); padding:24px 20px; text-align:center; color:var(--muted); font-size:12px; max-width:700px; margin:0 auto; }

/* chat */
.rl-chat-fab{ position:fixed; bottom:22px; right:22px; width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--primary2)); color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 14px 30px -8px rgba(124,92,255,.55); z-index:150; transition:transform .2s; }
.rl-chat-fab:hover{ transform:scale(1.08); }
.rl-chat-panel{ position:fixed; bottom:90px; right:22px; width:340px; max-width:90vw; height:440px; background:var(--surface); border:1px solid var(--line); border-radius:18px; display:flex; flex-direction:column; z-index:150; overflow:hidden; animation: rl-fade-up .3s ease both; box-shadow:0 30px 60px -16px rgba(20,20,50,.35); }
.rl-chat-head{ padding:14px 16px; border-bottom:1px solid var(--line); }
.rl-chat-body{ flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:8px; }
.rl-chat-msg{ font-size:13px; padding:9px 12px; border-radius:14px; max-width:85%; line-height:1.45; animation: rl-fade-up .25s ease both; }
.rl-chat-msg.bot{ background:var(--surface-soft); align-self:flex-start; border-bottom-left-radius:3px; }
.rl-chat-msg.user{ background:linear-gradient(120deg,var(--primary),var(--primary2)); color:#fff; align-self:flex-end; border-bottom-right-radius:3px; font-weight:600; }
.rl-chat-input{ display:flex; border-top:1px solid var(--line); padding:10px; gap:8px; }
.rl-chat-input input{ flex:1; background:var(--surface-soft); border:1px solid var(--line); color:var(--ink); padding:9px 12px; border-radius:9px; outline:none; font-size:13px; }
.rl-chat-input button{ background:linear-gradient(120deg,var(--primary),var(--primary2)); border:none; color:#fff; width:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.rl-chat-hint{ font-size:11px; color:var(--muted); text-align:center; padding:6px 10px 10px; }

/* responsive */
@media (max-width: 1024px){ .rl-hero-grid{ grid-template-columns:1fr; } .rl-list{ grid-template-columns:1fr; } .rl-pd-grid{ grid-template-columns:1fr; } }
@media (max-width: 760px){
  .rl-nav-links{ position:fixed; top:62px; left:0; right:0; background:var(--surface); border-bottom:1px solid var(--line); flex-direction:column; align-items:flex-start; padding:16px 20px; gap:16px; transform:translateY(-130%); transition:transform .25s ease; }
  .rl-nav-links.open{ transform:translateY(0); }
  .rl-burger{ display:block; }
  .rl-hero-copy h1{ font-size:38px; }
  .rl-hero-stats{ gap:22px; flex-wrap:wrap; }
  .rl-card{ flex-direction:column; }
  .rl-card-img{ width:100%; height:160px; }
  .rl-specs-grid{ grid-template-columns:1fr; }
  .rl-offer-row{ flex-direction:column; align-items:flex-start; }
  .rl-offer-right{ align-items:flex-start; width:100%; }
  .rl-form-grid{ grid-template-columns:1fr; }
  .rl-offer-form-row{ grid-template-columns:1fr 1fr; }
  .rl-chat-panel{ right:10px; left:10px; width:auto; }
}
`;
