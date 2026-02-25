// HAPUS const newReleaseProducts = [...] (hardcode)

let newReleaseProducts = []; // Buat variabel kosong

// Ganti fungsi DOMContentLoaded menjadi:
document.addEventListener("DOMContentLoaded", function () {
  loadCart();
  // Panggil fungsi fetch data
  fetchNewReleaseProducts();
});

// Tambahkan fungsi baru ini
async function fetchNewReleaseProducts() {
  try {
    const res = await fetch("/api/newrelease");
    if (res.ok) {
      newReleaseProducts = await res.json();
      renderNewReleaseProducts("all"); // Render ulang setelah data datang
    } else {
      console.error("Gagal memuat new release");
    }
  } catch (err) {
    console.error("Error:", err);
  }
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
  const product = newReleaseProducts.find((p) => p.id === productId);
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
    image: product.images[0],
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

  if (!badge) return; // Safety check

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
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/d4af37?text=DMK'">
      </div>
      <div class="cart-item-info">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Hapus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
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

  // Kosongkan keranjang setelah checkout
  cart = [];
  saveCart();
  toggleCart(); // Tutup sidebar keranjang
}

function checkoutAll() {
  if (cart.length === 0) {
    showToast("Keranjang masih kosong");
    return;
  }
  openCheckoutModal();
}

// ==================== FUNGSI BELI & NAVIGASI ====================
function buyNow(productId) {
  const product = newReleaseProducts.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;

  // Cek apakah sudah ada di keranjang
  const isInCart = cart.some((item) => item.id === productId);

  // Jika belum, tambahkan
  if (!isInCart) {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
    });
    saveCart();
  }

  // Langsung buka modal checkout
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
  const isExpanded = sidebar.classList.contains("active");
  btn.setAttribute("aria-expanded", isExpanded);
  document.body.style.overflow = isExpanded ? "hidden" : "";
}

// ==================== RENDER PRODUK ====================
function renderNewReleaseProducts(category) {
  const grid = document.getElementById("newReleaseGrid");
  const emptyState = document.getElementById("emptyState");
  const tabs = document.querySelectorAll(".category-tab");

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.category === category);
  });

  let filteredProducts =
    category === "all"
      ? newReleaseProducts
      : newReleaseProducts.filter((p) => p.category === category);
  grid.innerHTML = "";

  if (filteredProducts.length === 0) {
    emptyState.style.display = "block";
    grid.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  grid.style.display = "grid";

  filteredProducts.forEach((product, index) => {
    const card = document.createElement("div");
    card.className = "new-release-card";
    const isOutOfStock = product.stock <= 0;

    card.innerHTML = `
      <div class="nr-image-container">
        <span class="new-release-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> New</span>
        <span class="card-category-tag">${product.category}</span>
        <img src="${product.images[0]}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/22c55e?text=NEW'">
      </div>
      <div class="nr-card-info">
        <h3 class="nr-card-name">${product.name}</h3>
        <div class="nr-card-meta"><span>Ukuran: ${product.size}</span></div>
        <p class="nr-stock ${isOutOfStock ? "out-of-stock" : "available"}">${isOutOfStock ? "Stok Habis" : `Stok: ${product.stock}`}</p>
        <p class="nr-card-price">${formatPrice(product.price)}</p>
        <div class="nr-card-actions">
          <button class="nr-btn-cart" onclick="addToCart(${product.id})" ${isOutOfStock ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Keranjang
          </button>
          <button class="nr-btn-buy" onclick="buyNow(${product.id})" ${isOutOfStock ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Beli
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterNewRelease(category) {
  renderNewReleaseProducts(category);
}

// ==================== UTILITY FUNCTIONS ====================
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
