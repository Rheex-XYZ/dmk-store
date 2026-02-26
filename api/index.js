// ./api/index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Redis } from "@upstash/redis";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==================== SETUP REDIS OTOMATIS ====================
function getRedisConfig() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    };
  }
  if (process.env.REDIS_URL) {
    const urlObj = new URL(process.env.REDIS_URL);
    return {
      url: `https://${urlObj.hostname}`,
      token: urlObj.password,
    };
  }
  throw new Error("Database tidak terkonfigurasi. Cek Environment Variables.");
}

const redis = new Redis(getRedisConfig());
// ===============================================================

// Helper: Baca Data (sekarang menerima key dinamis)
const readData = async (key) => {
  try {
    const data = await redis.get(key);
    return data || [];
  } catch (err) {
    console.error("Gagal membaca data:", err);
    return [];
  }
};

// Helper: Tulis Data (sekarang menerima key dinamis)
const writeData = async (key, data) => {
  try {
    await redis.set(key, data);
  } catch (err) {
    console.error("Gagal menulis data:", err);
    throw err;
  }
};

// ==================== ROUTES ====================

// 1. Login Admin
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "dmkstore" && password === "dmkstore") {
    return res.json({ success: true, message: "Login berhasil" });
  }
  res
    .status(401)
    .json({ success: false, message: "Username atau password salah" });
});

// 2. Get Semua Produk (Dinamis: products, flashsale, newrelease)
app.get("/api/:type", async (req, res) => {
  try {
    const type = req.params.type;
    // Keamanan: Hanya izinkan tipe tertentu
    if (!["products", "flashsale", "newrelease"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Tipe produk tidak valid" });
    }
    const products = await readData(type);
    res.json(products);
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal ambil data: " + err.message });
  }
});

// 3. Tambah Produk Baru (Dinamis)
app.post("/api/:type", async (req, res) => {
  try {
    const type = req.params.type;
    if (!["products", "flashsale", "newrelease"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Tipe produk tidak valid" });
    }

    const products = await readData(type);

    // Handle image input (bisa single string atau array)
    let images = [];
    if (req.body.images) {
      images = req.body.images;
    } else if (req.body.image) {
      images = [req.body.image];
    } else {
      images = ["https://via.placeholder.com/400"];
    }

    const newProduct = {
      id: Date.now(), // ID unik
      ...req.body,
      images: images,
      stock: req.body.stock || 0,
    };

    // Khusus Flash Sale, hitung diskon jika tidak ada
    if (type === "flashsale" && req.body.originalPrice && req.body.price) {
      newProduct.discount = Math.round(
        ((req.body.originalPrice - req.body.price) / req.body.originalPrice) *
          100,
      );
    }

    products.push(newProduct);
    await writeData(type, products);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal menyimpan: " + err.message });
  }
});

// 4. Edit Produk (Dinamis)
app.put("/api/:type/:id", async (req, res) => {
  try {
    const type = req.params.type;
    if (!["products", "flashsale", "newrelease"].includes(type))
      return res.status(400).json({ success: false });

    let products = await readData(type);
    const id = parseInt(req.params.id);
    const index = products.findIndex((p) => p.id === id);

    if (index === -1)
      return res
        .status(404)
        .json({ success: false, message: "Produk tidak ditemukan" });

    // Update data
    products[index] = { ...products[index], ...req.body };

    // Update image array jika ada input image baru
    if (req.body.image) products[index].images = [req.body.image];

    // Update diskon flash sale
    if (type === "flashsale" && req.body.originalPrice && req.body.price) {
      products[index].discount = Math.round(
        ((req.body.originalPrice - req.body.price) / req.body.originalPrice) *
          100,
      );
    }

    await writeData(type, products);
    res.json({ success: true, product: products[index] });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal update: " + err.message });
  }
});

// 5. Hapus Produk (Dinamis)
app.delete("/api/:type/:id", async (req, res) => {
  try {
    const type = req.params.type;
    if (!["products", "flashsale", "newrelease"].includes(type))
      return res.status(400).json({ success: false });

    let products = await readData(type);
    const filtered = products.filter((p) => p.id !== parseInt(req.params.id));
    await writeData(type, filtered);
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal hapus: " + err.message });
  }
});

// 6. Checkout (Update Stok Dinamis)
app.post("/api/checkout", async (req, res) => {
  try {
    const { items } = req.body; // items harus berisi { id, quantity, type? } atau kita cek satu-satu

    // Kita asumsikan checkout bisa dari produk biasa, flash sale, dll.
    // Strategi sederhana: cek di semua koleksi atau dari tipe yang dikirim.
    // Untuk simplifikasi, kita akan update berdasarkan ID di semua koleksi jika ditemukan.

    let updated = false;

    for (const item of items) {
      const types = ["products", "flashsale", "newrelease"];
      for (const type of types) {
        let data = await readData(type);
        const idx = data.findIndex((p) => p.id === item.id);
        if (idx !== -1) {
          data[idx].stock = Math.max(0, (data[idx].stock || 0) - item.quantity);
          await writeData(type, data);
          updated = true;
          break; // Jika ketemu, lanjut item berikutnya
        }
      }
    }

    res.json({ success: true, message: "Checkout sukses" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal checkout: " + err.message });
  }
});

// ==================== FLASH SALE SETTINGS ====================

// Get Pengaturan Waktu
app.get("/api/flashsale/settings", async (req, res) => {
  try {
    const settings = await readData("flashsale_settings");
    res.json(settings || { endDate: null });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal ambil pengaturan" });
  }
});

// Simpan Pengaturan Waktu
app.post("/api/flashsale/settings", async (req, res) => {
  try {
    const { endDate } = req.body;
    // Simpan objek { endDate: "ISO_STRING" }
    await writeData("flashsale_settings", { endDate });
    res.json({ success: true, message: "Waktu flash sale diperbarui" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gagal simpan pengaturan" });
  }
});

// ===============================================================

export default app;
