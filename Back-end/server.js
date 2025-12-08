const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// file paths
const dataDir = path.join(__dirname);
const productsFile = path.join(dataDir, "products.json");
const ordersFile = path.join(dataDir, "orders.json");

// helper to read JSON
async function readJSON(filePath) {
  try {
    return await fs.readJson(filePath);
  } catch (err) {
    return null;
  }
}

// GET all products
app.get("/api/products", async (req, res) => {
  const products = await readJSON(productsFile);
  res.json(products || []);
});

// GET product by id
app.get("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const products = await readJSON(productsFile);
  const p = (products || []).find(x => x.id === id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

// POST order (checkout)
app.post("/api/checkout", async (req, res) => {
  const order = req.body;
  if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: "Order must include items" });
  }

  try {
    const orders = (await readJSON(ordersFile)) || [];
    const nextId = (orders.length ? Math.max(...orders.map(o => o.id || 0)) : 0) + 1;
    const newOrder = {
      id: nextId,
      createdAt: new Date().toISOString(),
      items: order.items,
      total: order.total || order.items.reduce((s,i)=> s + (i.price * i.quantity), 0),
      customer: order.customer || {}
    };
    orders.push(newOrder);
    await fs.writeJson(ordersFile, orders, { spaces: 2 });
    res.json({ success: true, orderId: newOrder.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// simple ping
app.get("/api/ping", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`LocalShop backend running on http://localhost:${PORT}`);
});
