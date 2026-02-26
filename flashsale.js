// ==================== FLASH SALE DATA ====================
let flashSaleProducts = [];
let FLASH_SALE_END = new Date();
let cart = [];

// Variabel untuk checkout
let currentCheckoutItems = [];
let isCheckoutFromCart = false;

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", function () {
  loadCart();
  initApp();
});

async function initApp() {
  await loadFlashSaleSettings();
  initCountdown();
  fetchFlashSaleProducts();
}

// ==================== LOAD SETTINGS ====================
async function loadFlashSaleSettings() {
  try {
    const res = await fetch("/api/flashsale/settings");
    const settings = await res.json();
    if (settings.endDate) {
      FLASH_SALE_END = new Date(settings.endDate);
    } else {
      FLASH_SALE_END = new Date(2020, 0, 1);
    }
  } catch (err) {
    console.error("Gagal load waktu flash sale", err);
  }
}

// ==================== COUNTDOWN ====================
function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const now = new Date().getTime();
  const endTime = FLASH_SALE_END.getTime();
  const distance = endTime - now;

  const countdownContainer = document.getElementById("countdownContainer");
  const productsSection = document.getElementById("flashProductsSection");

  if (distance < 0) {
    if (countdownContainer) countdownContainer.style.display = "none";
    if (productsSection)
      productsSection.innerHTML =
        "<div class='flash-empty-state'><h3>Flash Sale Berakhir</h3><p>Simpan jadwal baru di Admin Panel untuk memulai.</p></div>";
    return;
  }

  if (countdownContainer) countdownContainer.style.display = "inline-block";

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  if (document.getElementById("days"))
    document.getElementById("days").textContent = String(days).padStart(2, "0");
  if (document.getElementById("hours"))
    document.getElementById("hours").textContent = String(hours).padStart(
      2,
      "0",
    );
  if (document.getElementById("minutes"))
    document.getElementById("minutes").textContent = String(minutes).padStart(
      2,
      "0",
    );
  if (document.getElementById("seconds"))
    document.getElementById("seconds").textContent = String(seconds).padStart(
      2,
      "0",
    );
}

// ==================== FUNGSI KERANJANG ====================
function loadCart() {
  const savedCart = localStorage.getItem("dmk_cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartUI();
  }
}
function saveCart() {
  localStorage.setItem("dmk_cart", JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const product = flashSaleProducts.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;
  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    showToast("Produk sudah ada di keranjang");
    return;
  }
  cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images ? product.images[0] : "",
    isFlashSale: true,
  });
  saveCart();
  showToast("Produk ditambahkan ke keranjang");
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCartItems();
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const count = document.getElementById("cartCount");
  const footer = document.getElementById("cartFooter");
  const empty = document.getElementById("cartEmpty");
  const total = document.getElementById("cartTotal");
  if (!badge) return;
  badge.textContent = cart.length;
  count.textContent = cart.length;
  if (cart.length > 0) {
    badge.classList.add("visible");
    footer.style.display = "block";
    empty.style.display = "none";
    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    total.textContent = formatPrice(totalPrice);
  } else {
    badge.classList.remove("visible");
    footer.style.display = "none";
    empty.style.display = "flex";
  }
  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const emptyEl = document.getElementById("cartEmpty");
  if (!container) return;
  const existingItems = container.querySelectorAll(".cart-item");
  existingItems.forEach((item) => item.remove());
  if (cart.length === 0) {
    emptyEl.style.display = "flex";
    return;
  }
  emptyEl.style.display = "none";
  cart.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
      <div class="cart-item-image"><img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/d4af37?text=DMK'"></div>
      <div class="cart-item-info"><h4 class="cart-item-name">${item.name}</h4><span class="cart-item-price">${formatPrice(item.price)}</span></div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
    `;
    container.appendChild(itemEl);
  });
}

function toggleCart() {
  const cartSection = document.getElementById("cartSection");
  const cartOverlay = document.getElementById("cartOverlay");
  if (!cartSection) return;
  cartSection.classList.toggle("active");
  cartOverlay.classList.toggle("active");
  document.body.style.overflow = cartSection.classList.contains("active")
    ? "hidden"
    : "";
}

// ==================== FUNGSI MODAL CHECKOUT ====================
function openCheckoutModal(items, fromCart = false) {
  currentCheckoutItems = items;
  isCheckoutFromCart = fromCart;

  const summaryContainer = document.getElementById("modalOrderSummary");
  const totalPriceEl = document.getElementById("modalTotalPrice");
  const modal = document.getElementById("checkoutModal");
  const overlay = document.getElementById("checkoutModalOverlay");

  let summaryHTML = "";
  let total = 0;
  currentCheckoutItems.forEach((item) => {
    summaryHTML += `<div class="summary-item"><span>${item.name}</span><span>${formatPrice(item.price)}</span></div>`;
    total += item.price;
  });
  summaryContainer.innerHTML = summaryHTML;
  totalPriceEl.textContent = formatPrice(total);
  modal.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  const overlay = document.getElementById("checkoutModalOverlay");
  modal.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  currentCheckoutItems = [];
  isCheckoutFromCart = false;
}

async function confirmCheckout() {
  const selectedPayment = document.querySelector(
    'input[name="paymentMethod"]:checked',
  );
  if (!selectedPayment) {
    showToast("Pilih metode pembayaran");
    return;
  }
  const method = selectedPayment.value;
  let bankInfo = {};
  if (method === "bsi")
    bankInfo = {
      name: "Bank BSI",
      rekening: "7145183485",
      atasNama: "Sri Nofrianti",
    };
  else if (method === "nagari")
    bankInfo = {
      name: "Bank Nagari",
      rekening: "12010210069933",
      atasNama: "Sri Nofrianti",
    };

  // Kirim ke server untuk update stok
  try {
    const checkoutData = {
      items: currentCheckoutItems.map((item) => ({
        id: item.id,
        quantity: 1,
      })),
    };

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutData),
    });
    const result = await response.json();

    if (result.success) {
      let message = `Halo Kak, saya mau order dari DMK Store:\n\n`;
      currentCheckoutItems.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${formatPrice(item.price)}\n`;
        message += `   Link Foto: ${item.image}\n`;
      });
      const total = currentCheckoutItems.reduce(
        (sum, item) => sum + item.price,
        0,
      );
      message += `\n*Total: ${formatPrice(total)}*\n\n`;
      message += `*Metode Pembayaran:*\n${bankInfo.name}\nNo Rek: ${bankInfo.rekening}\na.n ${bankInfo.atasNama}\n\n`;
      message += `Mohon konfirmasi ketersediaan. Terima kasih!`;
      window.open(
        `https://wa.me/628116638877?text=${encodeURIComponent(message)}`,
        "_blank",
      );

      if (isCheckoutFromCart) {
        cart = [];
        saveCart();
        toggleCart();
      }

      closeCheckoutModal();
      fetchFlashSaleProducts(); // Refresh produk
      showToast("Checkout berhasil!");
    } else {
      showToast("Gagal update stok di server.");
    }
  } catch (err) {
    console.error(err);
    showToast("Terjadi error saat checkout.");
  }
}

function checkoutAll() {
  if (cart.length === 0) {
    showToast("Keranjang masih kosong");
    return;
  }
  openCheckoutModal(cart, true);
}

// ==================== FUNGSI BELI ====================
function buyNow(productId) {
  const product = flashSaleProducts.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;

  // Buat item sementara TANPA menambah ke cart
  const itemToBuy = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images ? product.images[0] : "",
  };

  openCheckoutModal([itemToBuy], false);
}

function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.querySelector(".burger-btn");
  if (!sidebar) return;
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
  btn.classList.toggle("active");
  document.body.style.overflow = sidebar.classList.contains("active")
    ? "hidden"
    : "";
}

// ==================== RENDER PRODUK ====================
async function fetchFlashSaleProducts() {
  const grid = document.getElementById("flashSaleGrid");
  try {
    const res = await fetch("/api/flashsale");
    if (res.ok) {
      flashSaleProducts = await res.json();
      renderFlashSaleProducts();
    }
  } catch (err) {
    console.error(err);
  }
}

function renderFlashSaleProducts() {
  const grid = document.getElementById("flashSaleGrid");
  if (!grid) return;

  if (flashSaleProducts.length === 0) {
    grid.innerHTML =
      "<p class='text-gray-500 col-span-2 text-center'>Belum ada produk Flash Sale.</p>";
    return;
  }

  grid.innerHTML = "";
  flashSaleProducts.forEach((product) => {
    const card = document.createElement("div");
    card.className = "flash-card";
    const isOutOfStock = product.stock <= 0;
    const discount = product.discount || 0;
    const imgSrc =
      product.images && product.images[0]
        ? product.images[0]
        : "https://via.placeholder.com/400?text=No+Image";

    card.innerHTML = `
      <div class="flash-image-container">
        <span class="flash-tag">Flash Sale</span>
        <span class="discount-badge">-${discount}%</span>
        <img src="${imgSrc}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/ef4444?text=Error'">
      </div>
      <div class="flash-card-info">
        <h3 class="flash-card-name">${product.name}</h3>
        <div class="flash-card-meta"><span>Ukuran: ${product.size || "-"}</span></div>
        <div class="flash-price-section">
          <span class="flash-price-original">${product.originalPrice ? formatPrice(product.originalPrice) : ""}</span>
          <span class="flash-price-sale">${formatPrice(product.price)}</span>
        </div>
        <p class="flash-stock ${isOutOfStock ? "out-of-stock" : "available"}">${isOutOfStock ? "Stok Habis!" : `Tersisa ${product.stock}`}</p>
        <div class="stock-progress"><div class="stock-progress-bar" style="width: ${product.stock > 0 ? (product.stock / (product.totalStock || product.stock)) * 100 : 0}%"></div></div>
        <div class="flash-card-actions">
          <button class="flash-btn-cart" onclick="addToCart(${product.id})" ${isOutOfStock ? "disabled" : ""}>Keranjang</button>
          <button class="flash-btn-buy" onclick="buyNow(${product.id})" ${isOutOfStock ? "disabled" : ""}>Beli</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ==================== UTILITY ====================
function formatPrice(price) {
  if (!price || isNaN(price)) return "Rp 0";
  return "Rp " + price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  if (toast && toastMessage) {
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}
