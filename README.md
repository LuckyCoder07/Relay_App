# Relay — AI Price Comparison Marketplace

This project has two parts:

1. **`relay-marketplace.jsx`** — a self-contained React app (the artifact you saw in
   Claude). It runs entirely in the browser using in-memory/browser storage, so it's the
   fastest way to test the UI and flows.
2. **`backend/`** — a real Express + MongoDB API with JWT auth, role-based access, and the
   same data model, for when you want to run this as an actual deployed product.
