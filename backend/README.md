# Relay backend (Express + MongoDB)

This is the real, deployable API that the `relay-marketplace.jsx` prototype is modeled on.
The prototype you saw in chat runs entirely client-side (using browser-based storage) so
it works instantly inside Claude's artifact preview. This folder is the production-shaped
version: a Node/Express API backed by MongoDB, with JWT auth and role-based access.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET
npm run seed            # loads demo products + admin/user accounts
npm run dev              # starts the API on http://localhost:4000
```

Demo accounts after seeding: `admin@relay.app` / `user@relay.app`, password `demo123`.

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create a User account |
| POST | `/api/auth/login` | — | Get a JWT |
| GET | `/api/auth/me` | user | Current profile |
| PATCH | `/api/auth/me/payment-preference` | user | Save preferred payment method (used by the AI verdict + chatbot) |
| GET | `/api/products?search=&category=&payment=` | — | Catalog with AI verdict ranking per product |
| GET | `/api/products/:id` | — | Single product with ranked offers |
| POST/PUT/DELETE | `/api/products/:id` | **Admin** | Catalog management |
| POST | `/api/orders/redirect` | user | Logs a "redirected to original site to pay" event |
| GET | `/api/orders/mine` | user | My order/redirect history |
| GET | `/api/orders` | **Admin** | All orders across users |
| PATCH | `/api/orders/:id/status` | **Admin** | Update tracking status |
| POST | `/api/chat/message` | user | Rule-based price assistant, can save payment preference |

## How the AI verdict works

Each product stores one `offer` subdocument per platform (Amazon, Flipkart, Myntra, Croma,
Reliance Digital, Nykaa…) with `price`, `mrp`, `deliveryDays`, `paymentOffer` text and `stock`.
`GET /api/products` scores every offer with a weighted formula — discount % (45%), delivery
speed (20%), match against the user's saved payment method (25%), stock availability (10%) —
and returns them ranked, with `bestOffer` as the top pick. This is intentionally simple and
explainable; swap in a real ML ranking model or call an LLM API later without changing the
contract the frontend expects (`ranked: []`, `bestOffer: {}`).

## Why redirect instead of checkout

Relay never collects payment details. `POST /api/orders/redirect` just logs which product,
platform and price the user was sent to, so it can show order history — the actual purchase
and payment happen on the retailer's own site, opened via `offer.url` in a new tab.

## Connecting the frontend

Swap the `window.storage` calls in `relay-marketplace.jsx` for `fetch` calls to these
endpoints (e.g. `fetch('/api/products')`, attaching `Authorization: Bearer <token>` after
login) once you deploy this backend. The data shapes already match.

## Deployment notes

- MongoDB: use MongoDB Atlas free tier for a hosted database (swap `MONGO_URI` in `.env`).
- Hosting: Render, Railway, or Fly.io all work well for this Express app.
- Set `CLIENT_ORIGIN` to your deployed frontend's URL for CORS.
- Rotate `JWT_SECRET` to a long random string before going live.
