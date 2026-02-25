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

// Switch Tab (Products / Flash Sale / New Release)
function switchTab(type) {
  currentType = type;

  // Update UI Tabs
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById(`tab-${type}`).classList.add("active");

  // Show/Hide Harga Asli field (only for Flash Sale)
  const originalPriceField = document.getElementById("field-originalPrice");
  if (type === "flashsale") {
    originalPriceField.classList.remove("hidden");
    document.getElementById("originalPrice").required = true;
  } else {
    originalPriceField.classList.add("hidden");
    document.getElementById("originalPrice").required = false;
  }

  // Update Titles
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

// Load Produk dari Server
async function loadProducts() {
  const listEl = document.getElementById("productList");
  listEl.innerHTML = '<p class="text-gray-500">Memuat produk...</p>';

  try {
    // Panggil API dinamis: /api/products, /api/flashsale, dll
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
  }
}

// Save Product (Add or Update)
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

  // Jika Flash Sale, tambahkan harga asli
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

// Edit: Isi form dengan data yang ada
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

      // Handle Flash Sale specific
      if (currentType === "flashsale" && product.originalPrice) {
        document.getElementById("originalPrice").value = product.originalPrice;
      }

      document.getElementById("formTitle").textContent =
        "Edit Produk: " + product.name;
      window.scrollTo(0, 0);
    }
  } catch (err) {
    console.error(err);
  }
}

// Delete
async function deleteProduct(id) {
  if (confirm("Yakin ingin menghapus produk ini?")) {
    try {
      const res = await fetch(`/api/${currentType}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        loadProducts();
      }
    } catch (err) {
      alert("Gagal menghapus");
    }
  }
}

function resetForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
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
