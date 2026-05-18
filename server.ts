import express from "express";
import path from "path";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Trust proxy to get correct IP for visit logs
app.set("trust proxy", true);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Initialize SQLite DB (Using file DB in the current directory)
const db = new Database(path.join(process.cwd(), "app.db"));
db.pragma("foreign_keys = ON");

// Setup uploads folder
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Setup Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images are allowed"));
    }
    cb(null, true);
  },
});

// Serve uploads as static files
app.use("/uploads", express.static(UPLOADS_DIR));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sequence INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS post_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS session_store (
      session_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      session_id TEXT,
      visit_date DATE DEFAULT CURRENT_DATE
    );
    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      ip TEXT,
      cookie_id TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);
}

initDb();

// === Helper Functions ===

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Middleware: Admin Guard
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionId = req.cookies.admin_session;
  if (!sessionId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const session = db.prepare("SELECT * FROM session_store WHERE session_id = ?").get(sessionId) as any;
  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired" });
  }

  // Check 60 mins inactivity
  const lastActivityStr = session.last_activity.replace(' ', 'T') + 'Z';
  const lastActivity = new Date(lastActivityStr).getTime();
  const now = Date.now();
  if (now - lastActivity > 60 * 60 * 1000) {
    db.prepare("DELETE FROM session_store WHERE session_id = ?").run(sessionId);
    res.clearCookie("admin_session");
    return res.status(401).json({ success: false, message: "Session timeout" });
  }

  // Update activity
  db.prepare("UPDATE session_store SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?").run(sessionId);
  next();
}

// === API ROUTES ===
const api = express.Router();

// 1. Log visit middleware
api.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/auth")) {
    const ip = req.ip || "unknown";
    const session_id = req.cookies.visitor_id || crypto.randomUUID();
    if (!req.cookies.visitor_id) {
      res.cookie("visitor_id", session_id, { maxAge: 365 * 24 * 60 * 60 * 1000 });
    }
    
    // Log visit once per day per session
    const today = new Date().toISOString().split("T")[0];
    const existing = db.prepare("SELECT id FROM site_visits WHERE session_id = ? AND visit_date = ?").get(session_id, today);
    if (!existing) {
      db.prepare("INSERT INTO site_visits (ip, session_id, visit_date) VALUES (?, ?, ?)").run(ip, session_id, today);
    }
  }
  next();
});

// Install (Set initial admin password)
api.post("/install", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: "Password required" });

  const existing = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'admin_password_hash'").get();
  if (existing) {
    return res.status(400).json({ success: false, message: "Already installed." });
  }

  db.prepare("INSERT INTO admin_settings (setting_key, setting_value) VALUES ('admin_password_hash', ?)").run(hashPassword(password));
  res.json({ success: true, message: "Admin configured. Please delete or protect this endpoint." });
});

// Check if installed
api.get("/status", (req, res) => {
  const existing = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'admin_password_hash'").get();
  res.json({ success: true, installed: !!existing });
});

// Auth
api.post("/auth/login", (req, res) => {
  const { password } = req.body;
  const adminEntry = db.prepare("SELECT setting_value FROM admin_settings WHERE setting_key = 'admin_password_hash'").get() as any;
  if (!adminEntry || !verifyPassword(password, adminEntry.setting_value)) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }

  const sessionId = crypto.randomUUID();
  db.prepare("INSERT INTO session_store (session_id) VALUES (?)").run(sessionId);
  res.cookie("admin_session", sessionId, { httpOnly: true });
  res.json({ success: true, message: "Logged in" });
});

api.post("/auth/logout", requireAdmin, (req, res) => {
  const sessionId = req.cookies.admin_session;
  db.prepare("DELETE FROM session_store WHERE session_id = ?").run(sessionId);
  res.clearCookie("admin_session");
  res.json({ success: true });
});

api.get("/auth/session", (req, res) => {
  const sessionId = req.cookies.admin_session;
  if (!sessionId) return res.json({ is_admin: false });
  const session = db.prepare("SELECT * FROM session_store WHERE session_id = ?").get(sessionId);
  res.json({ is_admin: !!session });
});

// Stats Dashboard
api.get("/stats", (req, res) => {
  const totalVisits = (db.prepare("SELECT COUNT(*) as c FROM site_visits").get() as any).c;
  const todayVisits = (db.prepare("SELECT COUNT(*) as c FROM site_visits WHERE visit_date = date('now')").get() as any).c;
  const totalPosts = (db.prepare("SELECT COUNT(*) as c FROM posts").get() as any).c;
  const totalCats = (db.prepare("SELECT COUNT(*) as c FROM categories").get() as any).c;
  res.json({ success: true, data: { totalVisits, todayVisits, totalPosts, totalCats } });
});

// Tree Data (Categories + Posts)
api.get("/tree", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories ORDER BY sequence ASC, id ASC").all() as any[];
  const posts = db.prepare("SELECT id, category_id, title FROM posts ORDER BY created_at DESC").all() as any[];
  
  const data = categories.map(cat => ({
    ...cat,
    posts: posts.filter(p => p.category_id === cat.id)
  }));
  res.json({ success: true, data });
});

// Categories
api.post("/categories", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Name required" });
  const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
  res.json({ success: true, id: info.lastInsertRowid });
});

api.delete("/categories/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const postCount = (db.prepare("SELECT COUNT(*) as c FROM posts WHERE category_id = ?").get(id) as any).c;
  if (postCount > 0) {
    return res.status(400).json({ success: false, message: "이 폴더 안에 글이 남아 있어 삭제할 수 없습니다. 먼저 글을 모두 삭제해 주세요." });
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  res.json({ success: true });
});

// Posts
api.post("/posts", requireAdmin, (req, res) => {
  const { category_id, title, content, pending_images } = req.body;
  const info = db.prepare("INSERT INTO posts (category_id, title, content) VALUES (?, ?, ?)").run(category_id, title, content);
  const postId = info.lastInsertRowid;
  
  // Link images
  if (pending_images && Array.isArray(pending_images)) {
    for (const imgId of pending_images) {
      db.prepare("UPDATE post_images SET post_id = ? WHERE id = ? AND post_id IS NULL").run(postId, imgId);
    }
  }
  res.json({ success: true, id: postId });
});

api.get("/posts/:id", (req, res) => {
  const post = db.prepare("SELECT p.*, c.name as category_name FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?").get(req.params.id) as any;
  if (!post) return res.status(404).json({ success: false });
  // increment view
  db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true, data: post });
});

api.put("/posts/:id", requireAdmin, (req, res) => {
  const { category_id, title, content, pending_images } = req.body;
  db.prepare("UPDATE posts SET category_id = ?, title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(category_id, title, content, req.params.id);
  
  if (pending_images && Array.isArray(pending_images)) {
    for (const imgId of pending_images) {
      db.prepare("UPDATE post_images SET post_id = ? WHERE id = ?").run(req.params.id, imgId);
    }
  }
  res.json({ success: true });
});

api.delete("/posts/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  // delete images
  const images = db.prepare("SELECT file_path FROM post_images WHERE post_id = ?").all(id) as any[];
  for (const img of images) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(img.file_path)));
    } catch(e) {}
  }
  db.prepare("DELETE FROM posts WHERE id = ?").run(id); // Cascade deletes post_images
  res.json({ success: true });
});

api.post("/posts/:id/like", (req, res) => {
  const id = req.params.id;
  const visitorId = req.cookies.visitor_id || "anon";
  const ip = req.ip || "unknown";
  
  const existing = db.prepare("SELECT id FROM post_likes WHERE post_id = ? AND (cookie_id = ? OR ip = ?)").get(id, visitorId, ip);
  if (existing) {
    db.prepare("DELETE FROM post_likes WHERE post_id = ? AND (cookie_id = ? OR ip = ?)").run(id, visitorId, ip);
    db.prepare("UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?").run(id);
    return res.json({ success: true, liked: false });
  } else {
    db.prepare("INSERT INTO post_likes (post_id, ip, cookie_id) VALUES (?, ?, ?)").run(id, ip, visitorId);
    db.prepare("UPDATE posts SET like_count = like_count + 1 WHERE id = ?").run(id);
    return res.json({ success: true, liked: true });
  }
});

// Upload
api.post("/upload", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const fileUrl = `/uploads/${req.file.filename}`;
  const info = db.prepare("INSERT INTO post_images (file_path, original_name) VALUES (?, ?)").run(fileUrl, req.file.originalname);
  res.json({ success: true, image_url: fileUrl, image_id: info.lastInsertRowid });
});

// Cleanup Orphan Images
api.post("/cleanup-images", requireAdmin, (req, res) => {
  // Find images older than 24 hours with no post_id
  const orphans = db.prepare("SELECT id, file_path FROM post_images WHERE post_id IS NULL AND created_at < datetime('now', '-1 day')").all() as any[];
  let deleted = 0;
  let failed = 0;
  for (const orphan of orphans) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(orphan.file_path)));
      db.prepare("DELETE FROM post_images WHERE id = ?").run(orphan.id);
      deleted++;
    } catch(e) {
      failed++;
    }
  }
  res.json({ success: true, deleted_count: deleted, failed_count: failed, message: "찌꺼기 이미지 정리가 완료되었습니다." });
});

app.use("/api", api);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
