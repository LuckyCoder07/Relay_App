# Relay — AI Price Comparison Marketplace

This project has two parts:

1. **`relay-marketplace.jsx`** — a self-contained React app (the artifact you saw in
   Claude). It runs entirely in the browser using in-memory/browser storage, so it's the
   fastest way to test the UI and flows.
2. **`backend/`** — a real Express + MongoDB API with JWT auth, role-based access, and the
   same data model, for when you want to run this as an actual deployed product.

You can test either independently. They aren't wired together yet (see "Connecting them" below).

---

## Part 1 — Testing the frontend prototype

The easiest path: re-open this project in Claude (upload `relay-marketplace.jsx` or paste
it back into a chat and ask Claude to "render this as an artifact"). Claude's artifact
preview runs React + the storage API natively, no setup needed.

**If you want to run it as a normal local React app instead:**

```bash
npx create-vite@latest relay-frontend -- --template react
cd relay-frontend
npm install lucide-react
```

Then:
- Replace the contents of `src/App.jsx` with `relay-marketplace.jsx`.
- This file calls `window.storage.get/set/...` (Claude's artifact-only persistence API).
  Outside Claude.ai, that object doesn't exist, so add a tiny shim before the `export default`
  line so the app doesn't crash:

  ```js
  if (!window.storage) {
    const mem = {};
    window.storage = {
      get: async (k) => (k in mem ? { key: k, value: mem[k] } : null),
      set: async (k, v) => { mem[k] = v; return { key: k, value: v }; },
      delete: async (k) => { delete mem[k]; return { key: k, deleted: true }; },
      list: async () => ({ keys: Object.keys(mem) }),
    };
  }
  ```

- `npm run dev` and open the printed `localhost` URL.

### Manual test checklist
1. **Landing page** loads with the hero verdict card animating in.
2. **Catalog** — search "watch", filter by category chips, confirm results update.
3. Click a product → **product detail** shows the verdict track and ranked offers.
4. Click **Add to compare cart**, go to the cart, confirm the running total.
5. Click **Buy on Amazon** (or any platform) — a new tab opens to that retailer's homepage.
6. Click **Log in**, use `user@relay.app` / `demo123` → go to **My Orders**, confirm the
   redirect you just made is logged.
7. Open the **chatbot** (bottom-right bubble), type `remember my payment is HDFC Credit Card`,
   then revisit a product page — the AI verdict text should now reference your saved card.
8. Log out, log back in as `admin@relay.app` / `demo123` → go to **Admin**, add a new
   product, edit an existing one's price, delete one, and check the **Order tracking** tab
   shows the order logged in step 6 under that user's email.
9. Resize the browser (or open dev tools device toolbar) to confirm mobile / tablet /
   desktop layouts — nav collapses to a hamburger under ~760px.

---

## Part 2 — Testing the backend API

Requires Node.js 18+ and either a local MongoDB or a free MongoDB Atlas cluster.

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI to your local mongodb://localhost:27017/relay
# or your Atlas connection string, and set a random JWT_SECRET
npm run seed     # creates demo products + admin/user accounts
npm run dev       # starts on http://localhost:4000
```

### Manual test checklist (using curl, or import into Postman/Insomnia)

```bash
# 1. Health check
curl http://localhost:4000/api/health

# 2. Log in as the seeded demo user
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@relay.app","password":"demo123"}'
# copy the returned "token"

# 3. Browse the catalog with AI verdict ranking
curl "http://localhost:4000/api/products"

# 4. Save a payment preference (replace TOKEN)
curl -X PATCH http://localhost:4000/api/auth/me/payment-preference \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"preferredPayment":"HDFC Credit Card"}'

# 5. Re-fetch products with that payment factored in
curl "http://localhost:4000/api/products?payment=HDFC%20Credit%20Card"

# 6. Log a "redirect to buy" event (replace PRODUCT_ID from step 3's response)
curl -X POST http://localhost:4000/api/orders/redirect \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","platform":"Amazon"}'

# 7. Check your order history
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/orders/mine

# 8. Log in as admin and view every user's orders
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@relay.app","password":"demo123"}'
curl -H "Authorization: Bearer ADMIN_TOKEN" http://localhost:4000/api/orders

# 9. Confirm a non-admin gets blocked from product management
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"Test","offers":[]}'
# expect 403 Forbidden
```

Watch the `npm run dev` terminal for `MongoDB connected` on startup — if that line is
missing, the API will exit immediately, which usually means `MONGO_URI` in `.env` is wrong.

---

## Connecting the two

They're independent right now so each can be tested in isolation. To make the frontend
talk to the real backend, replace the `window.storage` calls in `relay-marketplace.jsx`
with `fetch('http://localhost:4000/api/...')` calls (attaching the JWT after login) — the
backend's response shapes (`ranked`, `bestOffer`, order fields) already match what the
frontend expects. See `backend/README.md` for the full endpoint list.
