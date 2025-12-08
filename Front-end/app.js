const API_BASE = "http://localhost:4000/api";

let products = [];
let filtered = [];
let cart = loadCart();

// DOM refs
const productsGrid = document.getElementById("productsGrid");
const searchInput = document.getElementById("searchInput");
const catButtons = Array.from(document.querySelectorAll(".cat-btn"));
const cartToggle = document.getElementById("cartToggle");
const cartSidebar = document.getElementById("cartSidebar");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const closeCartBtn = document.getElementById("closeCart");
const checkoutBtn = document.getElementById("checkoutBtn");

const productModal = document.getElementById("productModal");
const closeModalBtn = document.getElementById("closeModal");
const modalImg = document.getElementById("modalImg");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalPrice = document.getElementById("modalPrice");
const modalQty = document.getElementById("modalQty");
const addModalCartBtn = document.getElementById("addModalCart");

let activeModalProduct = null;

// Init
fetchProducts();
bindEvents();
renderCart();

// fetch products
async function fetchProducts(){
  try{
    const res = await fetch(`${API_BASE}/products`);
    products = await res.json();
  } catch(e){
    console.error("Failed to fetch products from backend, falling back to demo listing", e);
    // fallback to a small demo list if backend not available
    products = [
      {id: 1, name:"Demo Product", price:300, category:"Misc", img:"https://picsum.photos/seed/demo/800/600", desc:"Demo item"}
    ];
  }
  filtered = products.slice();
  renderProducts();
}

// render product cards
function renderProducts(){
  productsGrid.innerHTML = "";
  if(!filtered.length){
    productsGrid.innerHTML = "<p style='color:var(--muted)'>No products found.</p>";
    return;
  }
  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <div class="info">
        <h4>${escapeHtml(p.name)}</h4>
        <p class="muted">${escapeHtml(p.desc)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="price">PKR ${p.price.toLocaleString()}</div>
          <div class="actions">
            <button class="btn" data-id="${p.id}" data-action="view">View</button>
            <button class="btn primary" data-id="${p.id}" data-action="add">Add</button>
          </div>
        </div>
      </div>
    `;
    productsGrid.appendChild(div);
  });
  // attach handlers for view/add buttons
  document.querySelectorAll("[data-action='view']").forEach(b => b.addEventListener("click", (e)=>{
    const id = Number(e.currentTarget.dataset.id);
    openModal(id);
  }));
  document.querySelectorAll("[data-action='add']").forEach(b => b.addEventListener("click", (e)=>{
    const id = Number(e.currentTarget.dataset.id);
    addToCartById(id, 1);
  }));
}

// category filter & search
function bindEvents(){
  searchInput.addEventListener("input", onSearch);
  catButtons.forEach(b => b.addEventListener("click", onCategory));
  cartToggle.addEventListener("click", ()=> toggleCart(true));
  closeCartBtn.addEventListener("click", ()=> toggleCart(false));
  checkoutBtn.addEventListener("click", onCheckout);

  // modal events
  closeModalBtn.addEventListener("click", closeModal);
  productModal.addEventListener("click", (e)=> { if(e.target === productModal) closeModal(); });
  addModalCartBtn.addEventListener("click", ()=>{
    const qty = Number(modalQty.value) || 1;
    addToCartById(activeModalProduct.id, qty);
    closeModal();
  });
}

function onSearch(e){
  const q = e.target.value.trim().toLowerCase();
  applyFilters({ query: q });
}

function onCategory(e){
  catButtons.forEach(b => b.classList.remove("active"));
  const btn = e.currentTarget;
  btn.classList.add("active");
  const cat = btn.dataset.cat;
  applyFilters({ category: cat });
}

function applyFilters({ category, query } = {}){
  const activeCat = category || document.querySelector(".cat-btn.active").dataset.cat;
  const q = (query !== undefined) ? query : searchInput.value.trim().toLowerCase();
  filtered = products.filter(p => {
    const inCat = (activeCat === "All") || (p.category === activeCat);
    const inSearch = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    return inCat && inSearch;
  });
  renderProducts();
}

// CART: save/load localStorage
function loadCart(){
  try{
    return JSON.parse(localStorage.getItem("localshop_cart") || "[]");
  } catch { return []; }
}
function saveCart(){
  localStorage.setItem("localshop_cart", JSON.stringify(cart));
  renderCart();
}

// add to cart by id
function addToCartById(id, qty=1){
  const p = products.find(x => x.id === id);
  if(!p) return alert("Product not found");
  const existing = cart.find(it => it.id === id);
  if(existing) existing.quantity += qty;
  else cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, quantity: qty });
  saveCart();
  flashCart();
}

// render cart sidebar content and counts
function renderCart(){
  const totalCount = cart.reduce((s,i)=> s + i.quantity, 0);
  const totalPrice = cart.reduce((s,i)=> s + (i.price * i.quantity), 0);
  cartCountEl.textContent = totalCount;
  cartTotalEl.textContent = `PKR ${totalPrice.toLocaleString()}`;

  cartItemsEl.innerHTML = "";
  if(!cart.length){ cartItemsEl.innerHTML = "<p style='color:var(--muted)'>Your cart is empty.</p>"; return; }

  cart.forEach(item => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.img}" alt="${escapeHtml(item.name)}" />
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${escapeHtml(item.name)}</strong></div>
          <div>PKR ${item.price.toLocaleString()}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-qty"/>
          <button class="btn" data-id="${item.id}" data-action="remove">Remove</button>
        </div>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });
  // qty change events
  document.querySelectorAll(".cart-qty").forEach(el=>{
    el.addEventListener("change", (e)=>{
      const id = Number(e.target.dataset.id);
      const v = Math.max(1, Number(e.target.value) || 1);
      const it = cart.find(x => x.id === id);
      if(it){ it.quantity = v; saveCart(); }
    });
  });
  // remove events
  document.querySelectorAll("[data-action='remove']").forEach(b=>{
    b.addEventListener("click", (e)=>{
      const id = Number(e.currentTarget.dataset.id);
      cart = cart.filter(i => i.id !== id);
      saveCart();
    });
  });
}

// toggle cart
function toggleCart(open){
  if(open){
    cartSidebar.classList.add("open");
    cartSidebar.setAttribute("aria-hidden", "false");
  } else {
    cartSidebar.classList.remove("open");
    cartSidebar.setAttribute("aria-hidden", "true");
  }
}

// flash cart on add
function flashCart(){
  toggleCart(true);
  setTimeout(()=> toggleCart(false), 1500);
}

// checkout (sends order to backend)
async function onCheckout(){
  if(!cart.length) return alert("Cart is empty.");
  // simple customer data prompt (for demo)
  const name = prompt("Enter your name for order:", "");
  if(name === null) return;
  const phone = prompt("Enter your phone number:", "");
  if(phone === null) return;

  const order = {
    items: cart,
    total: cart.reduce((s,i)=> s + i.price * i.quantity, 0),
    customer: { name, phone }
  };

  try{
    const res = await fetch(`${API_BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });
    const data = await res.json();
    if(res.ok){
      alert(`Order placed! Order ID: ${data.orderId}`);
      cart = [];
      saveCart();
      toggleCart(false);
    } else {
      alert("Checkout failed: " + (data.error || "unknown"));
    }
  } catch(e){
    console.error(e);
    alert("Could not reach server. If you are offline, order is saved locally. (Demo)");
    // optionally save offline
    localStorage.setItem("localshop_pending_order", JSON.stringify(order));
  }
}

// Quick view modal
function openModal(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  activeModalProduct = p;
  modalImg.src = p.img;
  modalTitle.textContent = p.name;
  modalDesc.textContent = p.desc;
  modalPrice.textContent = `PKR ${p.price.toLocaleString()}`;
  modalQty.value = 1;
  productModal.classList.add("open");
  productModal.setAttribute("aria-hidden", "false");
}
function closeModal(){
  productModal.classList.remove("open");
  productModal.setAttribute("aria-hidden", "true");
  activeModalProduct = null;
}

// helpers
function escapeHtml(str){
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':"&quot;"}[c]));
}
