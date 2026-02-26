// ==================== VARIABEL GLOBAL ====================
// Data produk sekarang diambil dari server, bukan hardcode
let products = [];
let cart = [];
let currentCategory = "all";

// ==================== INISIALISASI ====================
document.addEventListener("DOMContentLoaded", function () {
  loadCart();
  fetchProducts(); // Ambil data produk dari server saat halaman dimuat
  setupScrollEffects();
  setupNavbar();
});

// ==================== FUNGSI FETCH DATA DARI SERVER ====================
async function fetchProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Gagal memuat data");

    products = await response.json(); // Update variabel global products
    renderProducts(currentCategory); // Render ulang tampilan dengan data terbaru
  } catch (error) {
    console.error("Error:", error);
    const grid = document.getElementById("productsGrid");
    if (grid) {
      grid.innerHTML = `<div class="text-center py-12 col-span-full text-red-500">Gagal memuat data produk. Coba refresh halaman.</div>`;
    }
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
  // Cari produk dari data yang sudah di-fetch dari server
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  // Cek Stok
  if (product.stock <= 0) {
    showToast("Maaf, stok produk ini habis.");
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    showToast("Produk sudah ada di keranjang");
    return;
  }

  cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image:
      product.images && product.images[0]
        ? product.images[0]
        : "https://via.placeholder.com/400",
  });

  saveCart();
  showToast("Produk ditambahkan ke keranjang");

  // Update button state
  const btn = document.querySelector(`[data-product-id="${productId}"]`);
  if (btn) {
    btn.classList.add("added");
    btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Ditambahkan
        `;
  }
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCartItems();

  // Reset button state
  const btn = document.querySelector(`[data-product-id="${productId}"]`);
  if (btn) {
    btn.classList.remove("added");
    btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Keranjang
        `;
  }
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const count = document.getElementById("cartCount");
  const footer = document.getElementById("cartFooter");
  const empty = document.getElementById("cartEmpty");
  const total = document.getElementById("cartTotal");

  if (badge) badge.textContent = cart.length;
  if (count) count.textContent = cart.length;

  if (cart.length > 0) {
    if (badge) badge.classList.add("visible");
    if (footer) footer.style.display = "block";
    if (empty) empty.style.display = "none";

    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    if (total) total.textContent = formatPrice(totalPrice);
  } else {
    if (badge) badge.classList.remove("visible");
    if (footer) footer.style.display = "none";
    if (empty) empty.style.display = "flex";
  }

  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const emptyEl = document.getElementById("cartEmpty");

  if (!container) return;

  // Clear existing items except empty state
  const existingItems = container.querySelectorAll(".cart-item");
  existingItems.forEach((item) => item.remove());

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = "flex";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

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
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Hapus dari keranjang">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
    container.appendChild(itemEl);
  });
}

function toggleCart() {
  const cartSection = document.getElementById("cartSection");
  const cartOverlay = document.getElementById("cartOverlay");
  if (!cartSection || !cartOverlay) return;

  cartSection.classList.toggle("active");
  cartOverlay.classList.toggle("active");
  document.body.style.overflow = cartSection.classList.contains("active")
    ? "hidden"
    : "";
}

// ==================== FUNGSI PRODUK ====================
function renderProducts(category) {
  currentCategory = category;
  const grid = document.getElementById("productsGrid");
  const tag = document.getElementById("categoryTag");
  const title = document.getElementById("categoryTitle");

  if (!grid) return;

  // Update header
  const categoryNames = {
    all: "Semua Produk",
    kaos: "Koleksi Kaos",
    hoodie: "Koleksi Hoodie",
    celana: "Koleksi Celana",
    jeans: "Koleksi Jeans",
    kemeja: "Koleksi Kemeja",
    jaket: "Koleksi Jaket",
    rok: "Koleksi Rok",
    dress: "Koleksi Dress",
  };

  if (tag) tag.textContent = categoryNames[category] || "Koleksi Kami";
  if (title)
    title.innerHTML = `<span class="highlight">${categoryNames[category] || "Produk"}</span>`;

  let filteredProducts =
    category === "all"
      ? products
      : products.filter((p) => p.category === category);

  grid.innerHTML = "";

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
            <div class="text-center py-12 col-span-full">
                <p class="text-gray-400 text-lg">Belum ada produk dalam kategori ini</p>
                <button onclick="filterProducts('all')" class="btn btn-secondary mt-4">Lihat Semua Produk</button>
            </div>
        `;
    return;
  }

  filteredProducts.forEach((product, index) => {
    const card = document.createElement("div");
    card.className = "product-card reveal";
    card.style.animationDelay = `${index * 0.1}s`;

    const isInCart = cart.some((item) => item.id === product.id);
    const isOutOfStock = product.stock <= 0;

    // Handle jika images tidak ada atau kosong
    const productImages =
      product.images && product.images.length > 0
        ? product.images
        : ["https://via.placeholder.com/400x400/1a1a1a/d4af37?text=DMK"];

    let stockHTML = "";
    if (isOutOfStock) {
      stockHTML = `<p class="product-stock out-of-stock">Stok Habis</p>`;
    } else {
      stockHTML = `<p class="product-stock available">Stok: ${product.stock}</p>`;
    }

    card.innerHTML = `
            <div class="product-image-container">
                <span class="product-tag">${product.category}</span>
                ${isOutOfStock ? '<span class="sold-out-badge">HABIS</span>' : ""}
                <div class="product-slider" id="slider-${product.id}">
                    ${productImages
                      .map(
                        (img, i) => `
                        <div class="product-slide">
                            <img src="${img}" alt="${product.name} - ${i + 1}" onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/d4af37?text=DMK+Store'">
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                ${
                  productImages.length > 1
                    ? `
                    <button class="slider-nav slider-prev" onclick="slideImage(${product.id}, -1); event.stopPropagation();" aria-label="Gambar sebelumnya">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button class="slider-nav slider-next" onclick="slideImage(${product.id}, 1); event.stopPropagation();" aria-label="Gambar selanjutnya">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    <div class="slider-dots">
                        ${productImages.map((_, i) => `<span class="slider-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${product.id}, ${i})"></span>`).join("")}
                    </div>
                `
                    : ""
                }
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-size">Ukuran: ${product.size}</p>
                ${stockHTML}
                <p class="product-price">${formatPrice(product.price)}</p>
                <div class="product-actions">
                    <button class="btn-detail" onclick="openProductDetail(${product.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Lihat Deskripsi
                    </button>
                    
                    <button class="btn-cart ${isInCart ? "added" : ""}" data-product-id="${product.id}" onclick="addToCart(${product.id})" ${isOutOfStock ? "disabled" : ""}>
                        ${isInCart ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Ada` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`}
                    </button>
                    <button class="btn-buy" onclick="buyNow(${product.id})" ${isOutOfStock ? "disabled" : ""}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Beli
                    </button>
                </div>
            </div>
        `;

    grid.appendChild(card);
  });

  // Trigger reveal animation
  setTimeout(() => {
    document.querySelectorAll(".product-card.reveal").forEach((el) => {
      el.classList.add("active");
    });
  }, 100);

  // Update menu active state
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.category === category) {
      item.classList.add("active");
    }
  });

  // Close mobile menu
  closeMenu();
}

function filterProducts(category) {
  renderProducts(category);
  const el = document.getElementById("products");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

// ==================== SLIDER PRODUK ====================
const sliderStates = {};

function slideImage(productId, direction) {
  const product = products.find((p) => p.id === productId);
  if (!product || !product.images) return;

  const totalImages = product.images.length;
  if (!sliderStates[productId]) sliderStates[productId] = 0;

  sliderStates[productId] += direction;
  if (sliderStates[productId] < 0) sliderStates[productId] = totalImages - 1;
  if (sliderStates[productId] >= totalImages) sliderStates[productId] = 0;

  updateSlider(productId);
}

function goToSlide(productId, index) {
  sliderStates[productId] = index;
  updateSlider(productId);
}

function updateSlider(productId) {
  const slider = document.getElementById(`slider-${productId}`);
  if (!slider) return;

  const dots = slider.parentElement.querySelectorAll(".slider-dot");
  slider.style.transform = `translateX(-${sliderStates[productId] * 100}%)`;

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === sliderStates[productId]);
  });
}

// ==================== FUNGSI BELI & CHECKOUT (UPDATED) ====================

function buyNow(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    showToast("Maaf, stok produk ini habis.");
    return;
  }

  const isInCart = cart.some((item) => item.id === productId);

  if (!isInCart) {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image:
        product.images && product.images[0]
          ? product.images[0]
          : "https://via.placeholder.com/400",
    });
    saveCart();
    const btn = document.querySelector(`[data-product-id="${productId}"]`);
    if (btn) {
      btn.classList.add("added");
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Ditambahkan`;
    }
  }

  openCheckoutModal();
}

function checkoutAll() {
  if (cart.length === 0) {
    showToast("Keranjang masih kosong");
    return;
  }
  openCheckoutModal();
}

// ==================== FUNGSI MODAL CHECKOUT (DENGAN UPDATE STOK) ====================

function openCheckoutModal() {
  const summaryContainer = document.getElementById("modalOrderSummary");
  const totalPriceEl = document.getElementById("modalTotalPrice");
  const modal = document.getElementById("checkoutModal");
  const overlay = document.getElementById("checkoutModalOverlay");

  if (!summaryContainer || !modal || !overlay) return;

  let summaryHTML = "";
  let total = 0;

  cart.forEach((item) => {
    summaryHTML += `
      <div class="summary-item">
        <span>${item.name}</span>
        <span>${formatPrice(item.price)}</span>
      </div>
    `;
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

  if (modal) modal.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
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

  if (method === "bsi") {
    bankInfo = {
      name: "Bank BSI",
      rekening: "7145183485",
      atasNama: "Sri Nofrianti",
    };
  } else if (method === "nagari") {
    bankInfo = {
      name: "Bank Nagari",
      rekening: "12010210069933",
      atasNama: "Sri Nofrianti",
    };
  }

  // === BAGIAN BARU: KIRIM KE SERVER UNTUK KURANGI STOK ===
  try {
    const checkoutData = {
      items: cart.map((item) => ({
        id: item.id,
        quantity: 1, // Asumsi beli 1 per item
      })),
    };

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutData),
    });

    const result = await response.json();

    if (result.success) {
      // Jika sukses update stok di server, lanjut buka WhatsApp

      // Susun pesan WA
      let message = `Halo Kak, saya mau order dari DMK Store:\n\n`;
      cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name} - ${formatPrice(item.price)}\n`;
        message += `   Link Foto: ${item.image}\n`;
      });
      const total = cart.reduce((sum, item) => sum + item.price, 0);
      message += `\n*Total: ${formatPrice(total)}*\n\n`;
      message += `*Metode Pembayaran:*\n${bankInfo.name}\nNo Rek: ${bankInfo.rekening}\na.n ${bankInfo.atasNama}\n\n`;
      message += `Mohon konfirmasi ketersediaan. Terima kasih!`;

      window.open(
        `https://wa.me/628116638877?text=${encodeURIComponent(message)}`,
        "_blank",
      );

      // Bersihkan keranjang lokal
      cart = [];
      saveCart();
      closeCheckoutModal();
      toggleCart();

      // Ambil data produk terbaru untuk update tampilan stok di halaman
      fetchProducts();

      showToast("Checkout berhasil!");
    } else {
      showToast("Gagal memproses checkout di server.");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    showToast("Terjadi kesalahan saat checkout.");
  }
}

// ==================== FUNGSI NAVIGASI ====================
function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.querySelector(".burger-btn");

  if (!sidebar || !overlay || !btn) return;

  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
  btn.classList.toggle("active");

  const isExpanded = sidebar.classList.contains("active");
  btn.setAttribute("aria-expanded", isExpanded);

  if (isExpanded) {
    document.body.style.overflow = "hidden";
    document.body.classList.add("menu-open");
  } else {
    document.body.style.overflow = "";
    document.body.classList.remove("menu-open");
  }
}

function closeMenu() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.querySelector(".burger-btn");

  if (!sidebar || !overlay || !btn) return;

  sidebar.classList.remove("active");
  overlay.classList.remove("active");
  btn.classList.remove("active");
  btn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  document.body.classList.remove("menu-open");
}

function showHome() {
  filterProducts("all");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== FUNGSI UTILITAS ====================
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

// ==================== SCROLL EFFECTS ====================
function setupScrollEffects() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => {
    observer.observe(el);
  });
}

function setupNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// ==================== FUNGSI MODAL DETAIL PRODUK ====================

function openProductDetail(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("productModal");
  const overlay = document.getElementById("productModalOverlay");
  const content = document.getElementById("productModalContent");
  const title = document.getElementById("productModalTitle");

  if (!modal || !content || !title) return;

  title.textContent = product.name;

  const isOutOfStock = product.stock <= 0;
  const stockStatus = isOutOfStock
    ? `<span style="color:#ef4444; font-weight:bold;">Stok Habis</span>`
    : `<span style="color:#22c55e;">Stok: ${product.stock}</span>`;

  content.innerHTML = `
        <img src="${product.images && product.images[0] ? product.images[0] : "https://via.placeholder.com/500x300/1a1a1a/d4af37?text=DMK"}" alt="${product.name}" class="product-modal-image" onerror="this.src='https://via.placeholder.com/500x300/1a1a1a/d4af37?text=DMK'">
        <div class="product-modal-info">
            <div class="product-modal-price">${formatPrice(product.price)}</div>
            <div class="product-modal-meta">
                <span>Kategori: ${product.category}</span>
                <span>Ukuran: ${product.size}</span>
            </div>
            ${stockStatus}
            
            <h4 class="product-modal-desc-title">Deskripsi Produk</h4>
            <p class="product-modal-desc-text">${product.description || "Tidak ada deskripsi."}</p>
            
            <div class="product-modal-actions">
                <button class="btn-buy" onclick="buyNow(${product.id}); closeProductDetail();" ${isOutOfStock ? "disabled" : ""}>
                    Beli via WA
                </button>
            </div>
        </div>
    `;

  modal.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeProductDetail() {
  const modal = document.getElementById("productModal");
  const overlay = document.getElementById("productModalOverlay");

  if (modal) modal.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
}
