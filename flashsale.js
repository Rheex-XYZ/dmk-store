// HAPUS const flashSaleProducts = [...] (hardcode)

let flashSaleProducts = []; // Buat variabel kosong

// Ganti fungsi DOMContentLoaded menjadi:
document.addEventListener("DOMContentLoaded", function () {
  loadCart();
  initCountdown();
  // Panggil fungsi fetch data
  fetchFlashSaleProducts();
});

// Tambahkan fungsi baru ini
async function fetchFlashSaleProducts() {
  try {
    const res = await fetch("/api/flashsale");
    if (res.ok) {
      flashSaleProducts = await res.json();
      renderFlashSaleProducts(); // Render ulang setelah data datang
    } else {
      console.error("Gagal memuat flash sale");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Fungsi lainnya tetap sama...

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
        "<div class='flash-empty-state'><h3>Flash Sale Berakhir</h3></div>";
    return;
  }
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
    price: product.salePrice,
    image: product.images[0],
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
function openCheckoutModal() {
  const summaryContainer = document.getElementById("modalOrderSummary");
  const totalPriceEl = document.getElementById("modalTotalPrice");
  const modal = document.getElementById("checkoutModal");
  const overlay = document.getElementById("checkoutModalOverlay");
  let summaryHTML = "";
  let total = 0;
  cart.forEach((item) => {
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
}
function confirmCheckout() {
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

  let message = `Halo Kak, saya mau order dari DMK Store:\n\n`;
  cart.forEach((item, index) => {
    message += `${index + 1}. ${item.name} - ${formatPrice(item.price)}\n`;
    message += `   Link Foto: ${item.image}\n`; // LINK GAMBAR DITAMBAHKAN
  });
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  message += `\n*Total: ${formatPrice(total)}*\n\n`;
  message += `*Metode Pembayaran:*\n${bankInfo.name}\nNo Rek: ${bankInfo.rekening}\na.n ${bankInfo.atasNama}\n\n`;
  message += `Mohon konfirmasi ketersediaan. Terima kasih!`;
  window.open(
    `https://wa.me/628116638877?text=${encodeURIComponent(message)}`,
    "_blank",
  );
  closeCheckoutModal();
  cart = [];
  saveCart();
  toggleCart();
}
function checkoutAll() {
  if (cart.length === 0) {
    showToast("Keranjang masih kosong");
    return;
  }
  openCheckoutModal();
}

// ==================== FUNGSI BELI ====================
function buyNow(productId) {
  const product = flashSaleProducts.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;
  const isInCart = cart.some((item) => item.id === productId);
  if (!isInCart) {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.salePrice,
      image: product.images[0],
    });
    saveCart();
  }
  openCheckoutModal();
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
function renderFlashSaleProducts() {
  const grid = document.getElementById("flashSaleGrid");
  if (flashSaleProducts.length === 0) {
    grid.style.display = "none";
    return;
  }
  grid.innerHTML = "";
  flashSaleProducts.forEach((product, index) => {
    const card = document.createElement("div");
    card.className = "flash-card";
    const isOutOfStock = product.stock <= 0;
    const stockPercentage = (product.stock / product.totalStock) * 100;
    card.innerHTML = `
      <div class="flash-image-container">
        <span class="flash-tag">Flash Sale</span>
        <span class="discount-badge">-${product.discount}%</span>
        <img src="${product.images[0]}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/ef4444?text=SALE'">
      </div>
      <div class="flash-card-info">
        <h3 class="flash-card-name">${product.name}</h3>
        <div class="flash-card-meta"><span>Ukuran: ${product.size}</span></div>
        <div class="flash-price-section">
          <span class="flash-price-original">${formatPrice(product.originalPrice)}</span>
          <span class="flash-price-sale">${formatPrice(product.salePrice)}</span>
        </div>
        <p class="flash-stock ${isOutOfStock ? "out-of-stock" : "available"}">${isOutOfStock ? "Stok Habis!" : `Tersisa ${product.stock}`}</p>
        <div class="stock-progress"><div class="stock-progress-bar" style="width: ${stockPercentage}%"></div></div>
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
