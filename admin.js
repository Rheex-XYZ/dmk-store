// ================== ADMIN LOGIC ==================
let currentType = "products"; // Default: products, flashsale, newrelease

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("dmk_admin_logged_in");
  if (isLoggedIn === "true") {
    showDashboard();
  } else {
    showLogin();
  }
});

function showLogin() {
  document.getElementById("loginModal").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("loginModal").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  loadProducts();
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("dmk_admin_logged_in", "true");
      showDashboard();
    } else {
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    errorEl.textContent = "Terjadi kesalahan server";
    errorEl.classList.remove("hidden");
  }
}

function logout() {
  localStorage.removeItem("dmk_admin_logged_in");
  location.reload();
}

// ================== SWITCH TAB ==================
function switchTab(type) {
  currentType = type;

  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`tab-${type}`).classList.add("active");

  const timerSettings = document.getElementById("flashSaleTimerSettings");
  const originalPriceField = document.getElementById("field-originalPrice");

  if (type === "flashsale") {
    timerSettings.classList.remove("hidden");
    originalPriceField.classList.remove("hidden");
    document.getElementById("originalPrice").required = true;
    loadFlashSaleSettings();
  } else {
    timerSettings.classList.add("hidden");
    originalPriceField.classList.add("hidden");
    document.getElementById("originalPrice").required = false;
  }

  const titles = {
    products: { form: "Tambah Produk Utama", list: "Daftar Produk Utama" },
    flashsale: { form: "Tambah Flash Sale", list: "Daftar Flash Sale" },
    newrelease: { form: "Tambah New Release", list: "Daftar New Release" },
  };
  document.getElementById("formTitle").textContent = titles[type].form;
  document.getElementById("listTitle").textContent = titles[type].list;

  resetForm();
  loadProducts();
}

// ================== FLASH SALE SETTINGS ==================
async function loadFlashSaleSettings() {
  try {
    const res = await fetch("/api/flashsale/settings");
    const settings = await res.json();

    const inputEl = document.getElementById("flashSaleEndTime");
    const infoEl = document.getElementById("currentEndTime");

    if (settings.endDate) {
      const dateObj = new Date(settings.endDate);
      const localDate = new Date(
        dateObj.getTime() - dateObj.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
      inputEl.value = localDate;
      infoEl.textContent = `Jadwal saat ini: ${dateObj.toLocaleString("id-ID")}`;
    } else {
      inputEl.value = "";
      infoEl.textContent = "Belum ada jadwal ditetapkan.";
    }
  } catch (err) {
    console.error("Gagal load settings", err);
  }
}

async function saveFlashSaleSettings() {
  const inputVal = document.getElementById("flashSaleEndTime").value;
  if (!inputVal) {
    alert("Pilih tanggal dan waktu terlebih dahulu!");
    return;
  }
  const isoDate = new Date(inputVal).toISOString();
  try {
    const res = await fetch("/api/flashsale/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: isoDate }),
    });
    const data = await res.json();
    if (data.success) {
      alert("Jadwal flash sale berhasil disimpan!");
      loadFlashSaleSettings();
    } else {
      alert("Gagal menyimpan jadwal.");
    }
  } catch (err) {
    alert("Error koneksi: " + err.message);
  }
}

// ================== PRODUCT CRUD ==================
async function loadProducts() {
  const listEl = document.getElementById("productList");
  listEl.innerHTML = '<p class="text-gray-500">Memuat produk...</p>';

  try {
    const res = await fetch(`/api/${currentType}`);
    const products = await res.json();

    if (products.length === 0) {
      listEl.innerHTML =
        '<p class="text-gray-500 col-span-2">Belum ada produk.</p>';
      return;
    }

    listEl.innerHTML = products
      .map(
        (p) => `
      <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 flex gap-4">
        <img src="${p.images && p.images[0] ? p.images[0] : ""}" alt="${p.name}" class="w-24 h-24 object-cover rounded" onerror="this.src='https://via.placeholder.com/100'">
        <div class="flex-1">
          <h3 class="font-bold text-yellow-500">${p.name}</h3>
          <p class="text-sm text-gray-400">Kategori: ${p.category || "-"}</p>
          <p class="text-sm text-gray-400">Stok: ${p.stock}</p>
          <p class="font-bold text-white">${formatPrice(p.price)}</p>
          ${p.originalPrice ? `<p class="text-xs text-gray-500 line-through">${formatPrice(p.originalPrice)}</p>` : ""}
        </div>
        <div class="flex flex-col gap-2">
          <button onclick="editProduct(${p.id})" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Edit</button>
          <button onclick="deleteProduct(${p.id})" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">Hapus</button>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    listEl.innerHTML =
      '<p class="text-red-500 col-span-2">Gagal memuat data.</p>';
  }
}

async function saveProduct(e) {
  e.preventDefault();

  const id = document.getElementById("productId").value;
  const productData = {
    name: document.getElementById("name").value,
    price: parseInt(document.getElementById("price").value),
    stock: parseInt(document.getElementById("stock").value),
    category: document.getElementById("category").value,
    size: document.getElementById("size").value,
    image: document.getElementById("image").value,
    description: document.getElementById("description").value,
  };

  if (currentType === "flashsale") {
    productData.originalPrice = parseInt(
      document.getElementById("originalPrice").value,
    );
  }

  const url = id ? `/api/${currentType}/${id}` : `/api/${currentType}`;
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    const data = await res.json();

    if (data.success) {
      alert(id ? "Produk berhasil diupdate!" : "Produk berhasil ditambahkan!");
      resetForm();
      loadProducts();
    } else {
      alert("ERROR: " + (data.message || "Gagal menyimpan produk"));
    }
  } catch (err) {
    alert("Terjadi kesalahan koneksi: " + err.message);
  }
}

async function editProduct(id) {
  try {
    const res = await fetch(`/api/${currentType}`);
    const products = await res.json();
    const product = products.find((p) => p.id === id);

    if (product) {
      document.getElementById("productId").value = product.id;
      document.getElementById("name").value = product.name;
      document.getElementById("price").value = product.price;
      document.getElementById("stock").value = product.stock;
      document.getElementById("category").value = product.category;
      document.getElementById("size").value = product.size || "";
      document.getElementById("image").value = product.images
        ? product.images[0]
        : "";
      document.getElementById("description").value = product.description || "";

      if (currentType === "flashsale" && product.originalPrice) {
        document.getElementById("originalPrice").value = product.originalPrice;
      }

      // Tampilkan preview gambar saat edit
      const previewEl = document.getElementById("imagePreview");
      const previewImg = document.getElementById("previewImg");
      if (product.images && product.images[0]) {
        previewImg.src = product.images[0];
        previewEl.classList.remove("hidden");
      } else {
        previewEl.classList.add("hidden");
      }

      document.getElementById("formTitle").textContent =
        "Edit Produk: " + product.name;
      window.scrollTo(0, 0);
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteProduct(id) {
  if (confirm("Yakin ingin menghapus produk ini?")) {
    try {
      const res = await fetch(`/api/${currentType}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) loadProducts();
    } catch (err) {
      alert("Gagal menghapus");
    }
  }
}

function resetForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("imagePreview").classList.add("hidden"); // Sembunyikan preview saat reset
  const titles = {
    products: "Tambah Produk Utama",
    flashsale: "Tambah Flash Sale",
    newrelease: "Tambah New Release",
  };
  document.getElementById("formTitle").textContent = titles[currentType];
}

function formatPrice(price) {
  return "Rp " + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ================== FITUR UPLOAD GAMBAR (DENGAN KOMPRESI) ==================
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById("uploadStatus");
  const previewEl = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");
  const inputUrl = document.getElementById("image");

  statusEl.textContent = "Memproses gambar...";
  statusEl.className = "text-xs text-yellow-500 mt-1";

  if (!file.type.startsWith("image/")) {
    statusEl.textContent = "Hanya file gambar yang diizinkan!";
    statusEl.className = "text-xs text-red-500 mt-1";
    return;
  }

  try {
    // PANGGIL FUNGSI KOMPRESI
    // Max lebar 800px, kualitas 80% (0.8)
    const compressedBase64 = await compressImage(file, 800, 0.8);

    statusEl.textContent = "Mengupload...";

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: compressedBase64 }),
    });

    const data = await res.json();

    if (data.success) {
      inputUrl.value = data.url;
      statusEl.textContent = "Upload berhasil!";
      statusEl.className = "text-xs text-green-500 mt-1";

      previewImg.src = data.url;
      previewEl.classList.remove("hidden");
    } else {
      throw new Error(data.message || "Gagal upload ke server");
    }
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "text-xs text-red-500 mt-1";
  }
}

// FUNGSI HELPER KOMPRESI (CANVAS)
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
      const img = new Image();
      img.src = event.target.result;
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = function (err) {
        reject(err);
      };
    };
    reader.onerror = function (err) {
      reject(err);
    };
  });
}
