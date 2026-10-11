-- Run once against a Cloudflare D1 database bound as DB.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0,1)),
  rank INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  cost_snapshot_cents INTEGER NOT NULL DEFAULT 0,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment','paid','processing','fulfilled','cancelled','refunded')),
  payment_reference TEXT,
  delivery_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Example inventory only. These are NOT real goods, warranties or offers.
INSERT OR IGNORE INTO products(id,title,category,description,price_cents,cost_cents,active,rank)
VALUES
('sample-ai','数字工具服务 · 展示样例','数字工具','演示商品，不构成真实报价或交付承诺。',3999,0,1,1),
('sample-help','数字服务套餐 · 展示样例','数字生活','实际可售商品和价格将在正式上架后公布。',9900,0,1,2);
