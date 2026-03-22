/* Main JavaScript for Sweet Oven Bakery */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkVQaC7NP46moG8TD_YOVaEAX6lzUTnu8",
  authDomain: "sunshine-bakery-9bda9.firebaseapp.com",
  projectId: "sunshine-bakery-9bda9",
  storageBucket: "sunshine-bakery-9bda9.appspot.com",
  messagingSenderId: "122017645423",
  appId: "1:122017645423:web:9700393aefc56520dd9e9a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('script.js loaded:', window.location.href);

const productData = [
  { id: 1, name: 'Chocolate Cake', price: 2150, stock: 1, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80' },
  { id: 2, name: 'Red Velvet Cake', price: 2350, stock: 1, image: 'https://images.unsplash.com/photo-1514986888952-8cd320577b22?auto=format&fit=crop&w=800&q=80' },
  { id: 3, name: 'Cupcake', price: 160, stock: 1, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80' },
  { id: 4, name: 'Donut', price: 120, stock: 1, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' },
  { id: 5, name: 'Brownie', price: 180, stock: 1, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80' },
  { id: 6, name: 'Pastry', price: 220, stock: 1, image: 'https://images.unsplash.com/photo-1561214115-aa58fbf4ec62?auto=format&fit=crop&w=800&q=80' },
  { id: 7, name: 'Cookies', price: 110, stock: 1, image: 'https://images.unsplash.com/photo-1559628238-0e62fb79fde5?auto=format&fit=crop&w=800&q=80' },
  { id: 8, name: 'Macaron', price: 140, stock: 1, image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=800&q=80' }
];

let products;
let cart;
let latestOrderReceipt = null;
let latestReceiptId = null;

function getStoredProducts() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bakeryProducts'));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function getStoredCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bakeryCart'));
    if (Array.isArray(parsed)) {
      // Ensure all cart items have deliveryMethod and cartItemId
      return parsed.map(item => ({
        ...item,
        deliveryMethod: item.deliveryMethod || 'on-spot',
        cartItemId: item.cartItemId || `${Date.now()}_${Math.random().toString(36).slice(2)}`
      }));
    }
    return [];
  } catch (err) {
    return [];
  }
}

async function loadProductsFromFirestore() {
  try {
    const productsCollection = collection(db, 'products');
    const snapshot = await getDocs(productsCollection);

    if (snapshot.empty) {
      console.log('Firestore has no products yet');
      return false;
    }

    products = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: Number(docSnap.id) || docSnap.data().id }));
    localStorage.setItem('bakeryProducts', JSON.stringify(products));
    console.log('Loaded products from Firestore', products);

    if (document.getElementById('productGrid')) renderProducts();
    if (document.getElementById('productList')) populateProductAdmin();

    return true;
  } catch (err) {
    console.error('loadProductsFromFirestore error', err);
    return false;
  }
}

function syncProductsFromStorage() {
  const stored = getStoredProducts();
  products = stored || productData;
  if (!stored || !stored.length) {
    products = productData;
    localStorage.setItem('bakeryProducts', JSON.stringify(products));
  }

  console.log('syncProductsFromStorage', products.length, products.map(p => p.name));

  if (document.getElementById('productGrid')) renderProducts();
  if (document.getElementById('productList')) populateProductAdmin();
}

window.addEventListener('storage', (event) => {
  if (event.key === 'bakeryProducts') {
    try {
      const parsed = JSON.parse(event.newValue);
      products = Array.isArray(parsed) ? parsed : productData;
    } catch (err) {
      products = productData;
    }
    if (document.getElementById('productGrid')) renderProducts();
    if (document.getElementById('productList')) populateProductAdmin();
  }
});

products = getStoredProducts() || productData;
if (!getStoredProducts()) {
  localStorage.setItem('bakeryProducts', JSON.stringify(products));
}

cart = getStoredCart();

const defaultBakerySettings = {
  name: 'Sunshine Bakery',
  address: 'Main road, Gatkesar, Yamnampet, Secunderabad, Telangana 501302',
  phone: '9177261388',
  hours: '10:30 AM - 10:30 PM',
  rating: '4.6/5',
  story: 'At Sunshine Bakery, we craft fresh, delicious treats using premium ingredients and genuine care. Every cake, cupcake, cookie, puff, and donut is made to bring joy and celebrate your special moments.',
  desc: 'We take pride in quality, taste, and freshness—served daily with warmth and a touch of sweetness.'
};

const defaultAdminCredentials = {
  number: '071845',
  password: 'sunshine'
};

function loadAdminCredentials() {
  return JSON.parse(localStorage.getItem('adminCredentials')) || defaultAdminCredentials;
}

async function loadAdminCredentialsFromFirestore() {
  try {
    const credsDoc = await getDocs(collection(db, 'adminCredentials'));
    if (!credsDoc.empty) {
      const data = credsDoc.docs[0].data();
      const credentials = {
        number: data.number || defaultAdminCredentials.number,
        password: data.password || defaultAdminCredentials.password
      };
      // Cache in localStorage for offline access
      localStorage.setItem('adminCredentials', JSON.stringify(credentials));
      return credentials;
    }
  } catch (err) {
    console.error('Error loading admin credentials from Firestore:', err);
  }
  // Fallback to localStorage
  return loadAdminCredentials();
}

function saveAdminCredentials(credentials) {
  localStorage.setItem('adminCredentials', JSON.stringify(credentials));
}

async function saveAdminCredentialsToFirestore(credentials) {
  try {
    const credsCollection = collection(db, 'adminCredentials');
    const credsDoc = await getDocs(credsCollection);
    const docId = credsDoc.empty ? 'credentials' : credsDoc.docs[0].id;
    await setDoc(doc(db, 'adminCredentials', docId), credentials);
    console.log('Admin credentials saved to Firestore');
  } catch (err) {
    console.error('Error saving admin credentials to Firestore:', err);
  }
}

function isAdminLoggedIn() {
  return localStorage.getItem('bakeryAdminLoggedIn') === 'true' || sessionStorage.getItem('bakeryAdminLoggedIn') === 'true';
}

function setAdminLoggedIn(value) {
  const authValue = value ? 'true' : 'false';
  localStorage.setItem('bakeryAdminLoggedIn', authValue);
  sessionStorage.setItem('bakeryAdminLoggedIn', authValue);
}

function checkAdminLogin() {
  const overlay = document.getElementById('adminLoginSection');
  const adminContent = document.querySelector('.admin-main');
  if (!overlay || !adminContent) return false;

  if (isAdminLoggedIn()) {
    overlay.style.display = 'none';
    adminContent.style.display = 'block';
    return true;
  }

  overlay.style.display = 'flex';
  adminContent.style.display = 'none';
  return false;
}

function setupAdminAuth() {
  const loginBtn = document.getElementById('adminLoginBtn');
  const resetBtn = document.getElementById('adminResetBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (!loginBtn) {
    console.warn('Admin login button not found. Cannot initialize admin auth.');
    return;
  }

  checkAdminLogin();

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setAdminLoggedIn(false);
      localStorage.removeItem('bakeryAdminLoggedIn');
      sessionStorage.removeItem('bakeryAdminLoggedIn');
      checkAdminLogin();
      const error = document.getElementById('adminLoginError');
      if (error) error.textContent = 'You have been logged out.';
      document.getElementById('adminNumber').value = '';
      document.getElementById('adminPassword').value = '';
      console.log('Admin logout triggered.');
    });
  }

  loginBtn.addEventListener('click', async () => {
    const number = document.getElementById('adminNumber').value.trim();
    const password = document.getElementById('adminPassword').value;
    const error = document.getElementById('adminLoginError');
    
    // Load latest credentials from Firestore
    const storedCreds = await loadAdminCredentialsFromFirestore();

    if (!storedCreds.number || !storedCreds.password) {
      await saveAdminCredentialsToFirestore(defaultAdminCredentials);
    }

    if (number === storedCreds.number && password === storedCreds.password) {
      setAdminLoggedIn(true);
      if (error) error.textContent = '';
      document.getElementById('adminLoginSection').style.display = 'none';
      document.querySelector('.admin-main').style.display = 'block';
      await setupAdminPage();
      document.getElementById('adminNumber').value = '';
      document.getElementById('adminPassword').value = '';
    } else {
      if (error) error.textContent = 'Invalid number or password. Please try again.';
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      saveAdminCredentials(defaultAdminCredentials);
      await saveAdminCredentialsToFirestore(defaultAdminCredentials);
      setAdminLoggedIn(false);
      alert('Admin credentials have been reset to default. Please log in with the default credentials.');
      checkAdminLogin();
      await populateAdminCredentialsForm();
    });
  }
}

function loadBakerySettings() {
  const storage = JSON.parse(localStorage.getItem('bakerySettings')) || {};
  return {
    ...defaultBakerySettings,
    ...storage,
    story: defaultBakerySettings.story,
    desc: defaultBakerySettings.desc
  };
}

async function loadBakerySettingsFromFirestore() {
  try {
    const settingsDoc = await getDocs(collection(db, 'settings'));
    if (!settingsDoc.empty) {
      const data = settingsDoc.docs[0].data();
      const settings = {
        ...defaultBakerySettings,
        ...data,
        story: data.story || defaultBakerySettings.story,
        desc: data.desc || defaultBakerySettings.desc
      };
      // Cache in localStorage for offline access
      localStorage.setItem('bakerySettings', JSON.stringify(settings));
      return settings;
    }
  } catch (err) {
    console.error('Error loading bakery settings from Firestore:', err);
  }
  // Fallback to localStorage
  return loadBakerySettings();
}

function saveBakerySettings(settings) {
  localStorage.setItem('bakerySettings', JSON.stringify(settings));
}

async function saveBakerySettingsToFirestore(settings) {
  try {
    const settingsCollection = collection(db, 'settings');
    const settingsDoc = await getDocs(settingsCollection);
    const docId = settingsDoc.empty ? 'bakery' : settingsDoc.docs[0].id;
    await setDoc(doc(db, 'settings', docId), settings);
    console.log('Bakery settings saved to Firestore');
  } catch (err) {
    console.error('Error saving bakery settings to Firestore:', err);
  }
}

function applyBakerySettings() {
  const settings = loadBakerySettings();
  const fields = {
    siteName: document.getElementById('siteName'),
    heroTitle: document.getElementById('heroTitle'),
    aboutName: document.getElementById('aboutName'),
    aboutStory: document.getElementById('aboutStory'),
    aboutDesc: document.getElementById('aboutDesc'),
    infoAddress: document.getElementById('infoAddress'),
    infoPhone: document.getElementById('infoPhone'),
    infoHours: document.getElementById('infoHours'),
    infoRating: document.getElementById('infoRating')
  };

  if (fields.siteName) fields.siteName.textContent = settings.name;
  if (fields.heroTitle) fields.heroTitle.textContent = settings.name;
  if (fields.aboutName) fields.aboutName.textContent = 'Welcome to ' + settings.name;
  if (fields.aboutStory) fields.aboutStory.textContent = settings.story;
  if (fields.aboutDesc) fields.aboutDesc.textContent = settings.desc;
  if (fields.infoAddress) fields.infoAddress.textContent = settings.address;
  if (fields.infoPhone) fields.infoPhone.textContent = settings.phone;
  if (fields.infoHours) fields.infoHours.textContent = settings.hours;
  if (fields.infoRating) fields.infoRating.textContent = settings.rating;

  const heroLink = document.querySelector('.hero-buttons .btn-secondary');
  const mapLink = document.querySelector('.map-wrap a');
  if (mapLink) {
    const mapQuery = encodeURIComponent(settings.address);
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  }
}

async function populateBakeryAdminForm() {
  const settings = await loadBakerySettingsFromFirestore();
  const title = document.getElementById('adminBakeryName');
  const address = document.getElementById('adminBakeryAddress');
  const phone = document.getElementById('adminBakeryPhone');
  const hours = document.getElementById('adminBakeryHours');
  const rating = document.getElementById('adminBakeryRating');

  if (title) title.value = settings.name;
  if (address) address.value = settings.address;
  if (phone) phone.value = settings.phone;
  if (hours) hours.value = settings.hours;
  if (rating) rating.value = settings.rating;
}

function setupBakeryAdminSave() {
  const form = document.getElementById('bakeryDetailsForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentSettings = loadBakerySettings();
    const settings = {
      ...currentSettings,
      name: document.getElementById('adminBakeryName').value.trim(),
      address: document.getElementById('adminBakeryAddress').value.trim(),
      phone: document.getElementById('adminBakeryPhone').value.trim(),
      hours: document.getElementById('adminBakeryHours').value.trim(),
      rating: document.getElementById('adminBakeryRating').value.trim(),
      story: currentSettings.story,
      desc: currentSettings.desc
    };

    saveBakerySettings(settings);
    await saveBakerySettingsToFirestore(settings);
    applyBakerySettings();
    alert('Bakery details saved successfully.');
  });
}

async function populateAdminCredentialsForm() {
  const creds = await loadAdminCredentialsFromFirestore();
  const number = document.getElementById('adminNewNumber');
  const password = document.getElementById('adminNewPassword');
  if (number) number.value = creds.number;
  if (password) password.value = creds.password;
}

function setupAdminCredentialSave() {
  const form = document.getElementById('adminCredentialForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = document.getElementById('adminNewNumber').value.trim();
    const password = document.getElementById('adminNewPassword').value;
    const success = document.getElementById('adminCredSuccess');

    if (number && password) {
      const credentials = { number, password };
      saveAdminCredentials(credentials);
      await saveAdminCredentialsToFirestore(credentials);
      if (success) success.textContent = 'Admin credentials updated successfully.';
      setTimeout(() => { if (success) success.textContent = ''; }, 4000);
    }
  });
}

function saveProducts() {
  localStorage.setItem('bakeryProducts', JSON.stringify(products));
  if (document.getElementById('productGrid')) renderProducts();
  if (document.getElementById('productList')) populateProductAdmin();

  // Persist changes in Firestore so other devices see updates.
  syncProductsToFirestore().catch(err => console.error('Product sync to Firestore failed', err));
}

async function syncProductsToFirestore() {
  try {
    const productDocs = await getDocs(collection(db, 'products'));
    const remoteIds = new Set(productDocs.docs.map(d => d.id));
    const localIds = new Set(products.map(p => String(p.id)));

    // Update or create each local product in Firestore
    await Promise.all(products.map(async (product) => {
      await setDoc(doc(db, 'products', String(product.id)), {
        ...product
      });
    }));

    // Remove deleted local products from Firestore
    for (const remoteId of remoteIds) {
      if (!localIds.has(remoteId)) {
        await deleteDoc(doc(db, 'products', remoteId));
      }
    }
  } catch (err) {
    console.error('syncProductsToFirestore:', err);
    throw err;
  }
}

function saveCart() {
  localStorage.setItem('bakeryCart', JSON.stringify(cart));
}

function watchProductsFromFirestore() {
  const productsCollection = collection(db, 'products');
  onSnapshot(productsCollection, snapshot => {
    if (snapshot.empty) {
      console.log('Firestore products empty: using default products');
      products = productData;
      localStorage.setItem('bakeryProducts', JSON.stringify(products));
      if (document.getElementById('productGrid')) renderProducts();
      if (document.getElementById('productList')) populateProductAdmin();
      return;
    }

    const remoteProducts = snapshot.docs.map(docSnap => ({
      ...docSnap.data(),
      id: Number(docSnap.id) || docSnap.data().id
    }));

    products = remoteProducts;
    localStorage.setItem('bakeryProducts', JSON.stringify(products));

    if (document.getElementById('productGrid')) renderProducts();
    if (document.getElementById('productList')) populateProductAdmin();
  }, err => {
    console.error('watchProductsFromFirestore error', err);
  });
}

async function ensureFirestoreProductsSeeded() {
  const productsCollection = collection(db, 'products');
  const snapshot = await getDocs(productsCollection);
  if (snapshot.empty) {
    const initialProducts = getStoredProducts() || productData;
    await Promise.all(initialProducts.map(product => setDoc(doc(db, 'products', String(product.id)), product)));
  }
}

async function startFirestoreProductSync() {
  try {
    const hasRemote = await loadProductsFromFirestore();
    if (!hasRemote) {
      await ensureFirestoreProductsSeeded();
      console.log('Seeded Firestore products using local data');
    }
  } catch (err) {
    console.error('Error during Firestore product startup sync', err);
  }

  watchProductsFromFirestore();
}

function createTextReceipt(order, receiptId) {
  const lines = [];
  lines.push('Sunshine Bakery Receipt');
  lines.push(`Order No: ${receiptId}`);
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(`Customer: ${order.name}`);
  lines.push(`Phone: ${order.phone}`);
  lines.push(`Pickup Date/Time: ${order.pickupDate} ${order.pickupTime}`);
  lines.push(`Special Request: ${order.note || 'None'}`);
  lines.push('');
  lines.push('Items:');
  order.cart.forEach(item => {
    const deliveryText = item.deliveryMethod === 'parcel' ? ' (Parcel)' : ' (On Spot)';
    lines.push(`- ${item.name} x${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(item.price * item.quantity)}${deliveryText}`);
  });
  lines.push('');
  lines.push(`Subtotal: ${formatMoney(order.totals.subtotal)}`);
  lines.push(`Total: ${formatMoney(order.totals.total)}`);
  lines.push('');
  lines.push('Thank you for ordering from Sunshine Bakery. Enjoy your treats!');
  return new Blob([lines.join('\n')], { type: 'text/plain' });
}

function createPdfReceipt(order, receiptId) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('jsPDF is not loaded');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const settings = loadBakerySettings();
  const width = 595;
  const left = 36;
  const right = width - 36;

  doc.setFillColor(255, 173, 177);
  doc.rect(0, 0, width, 100, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(settings.name || 'Sunshine Bakery', left, 42);
  doc.setFontSize(10);
  doc.text(settings.address || '', left, 60);
  doc.text(`Phone: ${settings.phone || ''}`, left, 74);
  doc.text(`Rating: ${settings.rating || ''}`, left, 88);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Order No: ${receiptId}`, left, 118);
  doc.text(`Date: ${new Date().toLocaleString()}`, left, 132);
  doc.text(`Customer: ${order.name}`, left, 146);
  doc.text(`Phone: ${order.phone}`, left, 160);
  doc.text(`Pickup: ${order.pickupDate} ${order.pickupTime}`, left, 174);
  doc.text(`Note: ${order.note || 'None'}`, left, 188);

  let y = 210;
  doc.setFillColor(255, 230, 235);
  doc.rect(left, y - 14, right - left, 20, 'F');
  doc.setFontSize(11);
  doc.setTextColor(93, 33, 45);
  doc.text('Item', left + 8, y);
  doc.text('Qty', 360, y, { align: 'right' });
  doc.text('Price', 400, y, { align: 'right' });
  doc.text('Total', 480, y, { align: 'right' });

  y += 14;
  order.cart.forEach(item => {
    y += 18;
    if (y > 760) { doc.addPage(); y = 40; }
    doc.setFillColor(255, 248, 249);
    doc.rect(left, y - 12, right - left, 18, 'F');
    doc.setTextColor(77, 29, 37);
    const deliveryText = item.deliveryMethod === 'parcel' ? ' (Parcel)' : ' (On Spot)';
    const itemText = item.name + deliveryText;
    // Truncate item name if too long to fit in column
    const maxItemLength = 25; // Approximate characters that fit
    const truncatedItem = itemText.length > maxItemLength ? itemText.substring(0, maxItemLength) + '...' : itemText;
    doc.text(truncatedItem, left + 4, y);
    doc.text(String(item.quantity), 200, y, { align: 'right' });
    doc.text(formatMoney(item.price, 'Rs '), 280, y, { align: 'right' });
    doc.text(formatMoney(item.price * item.quantity, 'Rs '), 380, y, { align: 'right' });
  });

  y += 24;
  doc.setDrawColor(220, 166, 173);
  doc.setLineWidth(1);
  doc.line(left, y, right, y);
  y += 12;
  doc.setFontSize(12);
  doc.setTextColor(137, 24, 37);
  doc.text(`Subtotal: ${formatMoney(order.totals.subtotal, 'Rs ')}`, 335, y, { align: 'right' });
  y += 18;
  doc.setFontSize(14);
  doc.setTextColor(186, 25, 37);
  doc.text(`Total: ${formatMoney(order.totals.total, 'Rs ')}`, 335, y, { align: 'right' });

  y += 26;
  doc.setFontSize(10);
  doc.setTextColor(79, 43, 43);
  doc.text('Thank you for ordering from Sunshine Bakery!', left, y);

  return doc.output('blob');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function setupReceiptButton() {
  const btn = document.getElementById('downloadReceiptBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!latestOrderReceipt || !latestReceiptId) {
      alert('No receipt available. Place an order first.');
      return;
    }

    try {
      const textBlob = createTextReceipt(latestOrderReceipt, latestReceiptId);
      downloadBlob(textBlob, `receipt_${latestReceiptId}.txt`);
      const pdfBlob = createPdfReceipt(latestOrderReceipt, latestReceiptId);
      downloadBlob(pdfBlob, `receipt_${latestReceiptId}.pdf`);
    } catch (err) {
      console.error('Receipt generation failed', err);
      alert('Unable to generate receipt at this time.');
    }
  });
}

async function setupIndexPage() {
  console.log('setupIndexPage called');
  // Load latest bakery settings from Firestore
  const settings = await loadBakerySettingsFromFirestore();
  applyBakerySettings();
  renderProducts();

  const productSearch = document.getElementById('productSearch');
  if (productSearch) {
    productSearch.addEventListener('input', (e) => renderProducts(e.target.value.trim()));
  }

  renderCart();
  setupEventForm();
  setupOrderForm();
  setupReceiptButton();
  setupCartToggle();
  startFirestoreProductSync();

  document.querySelector('#clearCart').addEventListener('click', () => {
    cart = [];
    saveCart();
    renderCart();
    latestOrderReceipt = null;
    latestReceiptId = null;
    const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
    if (downloadReceiptBtn) {
      downloadReceiptBtn.style.display = 'none';
      downloadReceiptBtn.disabled = true;
    }
  });
}

function setupCartToggle() {
  const cartPanel = document.getElementById('cart');
  const toggleBtn = document.getElementById('toggleCartBtn');
  if (!cartPanel || !toggleBtn) return;

  let hidden = sessionStorage.getItem('bakeryCartHidden') === 'true';
  cartPanel.classList.toggle('collapsed', hidden);
  toggleBtn.textContent = hidden ? 'Show Cart' : 'Hide Cart';

  toggleBtn.addEventListener('click', () => {
    hidden = !hidden;
    cartPanel.classList.toggle('collapsed', hidden);
    toggleBtn.textContent = hidden ? 'Show Cart' : 'Hide Cart';
    sessionStorage.setItem('bakeryCartHidden', hidden ? 'true' : 'false');
  });
}

function renderProducts(searchTerm = '') {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = '';

  console.log('renderProducts', products.length, products.map(p => p.name));

  const query = String(searchTerm || '').trim().toLowerCase();
  const visibleProducts = query ? products.filter(p => p.name.toLowerCase().includes(query)) : products;

  if (!visibleProducts.length) {
    grid.innerHTML = '<p style="text-align:center; width:100%; color:#7f5d5a;">No products were found for this search.</p>';
    return;
  }

  visibleProducts.forEach(item => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const status = item.stock === 0 ? 'OUT OF STOCK' : 'IN STOCK';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="stock-tag">${status}</div>
      <h4>${item.name}</h4>
      <p>₹${item.price.toFixed(2)}</p>
      <button ${item.stock === 0 ? 'disabled' : ''} data-id="${item.id}" class="btn">Add to Cart</button>
    `;
    card.querySelector('button')?.addEventListener('click', () => addToCart(item.id));
    grid.appendChild(card);
  });
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const cartItem = {
    ...product,
    quantity: 1,
    deliveryMethod: 'on-spot',
    cartItemId: `${Date.now()}_${Math.random().toString(36).slice(2)}`
  };

  cart.push(cartItem);

  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p>Your cart is empty.</p>';
    updateTotals();
    return;
  }

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <h5>${item.name}</h5>
        <p>₹${item.price.toFixed(2)}</p>
        <div class="delivery-method">
          <label>
            <input type="radio" name="delivery-${item.cartItemId}" value="on-spot" ${item.deliveryMethod === 'on-spot' ? 'checked' : ''}>
            On Spot
          </label>
          <label>
            <input type="radio" name="delivery-${item.cartItemId}" value="parcel" ${item.deliveryMethod === 'parcel' ? 'checked' : ''}>
            Parcel
          </label>
        </div>
      </div>
      <div>
        <div class="quantity-control">
          <button data-action="decrease" data-cartid="${item.cartItemId}">-</button>
          <span>${item.quantity}</span>
          <button data-action="increase" data-cartid="${item.cartItemId}">+</button>
        </div>
        <button class="btn-sm btn-delete" data-action="remove" data-cartid="${item.cartItemId}">Remove</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('button[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const cartId = btn.dataset.cartid;
    btn.addEventListener('click', () => {
      const item = cart.find(i => i.cartItemId === cartId);
      if (!item) return;
      if (action === 'increase') {
        item.quantity += 1;
      } else if (action === 'decrease') {
        item.quantity -= 1;
      } else if (action === 'remove') {
        cart = cart.filter(i => i.cartItemId !== cartId);
      }
      cart = cart.filter(i => i.quantity > 0);
      saveCart();
      renderCart();
    });
  });

  // Add event listeners for delivery method changes
  container.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const cartId = e.target.name.substring('delivery-'.length);
      const item = cart.find(i => i.cartItemId === cartId);
      if (item) {
        item.deliveryMethod = e.target.value;
        saveCart();
        renderCart();
      }
    });
  });

  updateTotals();
}

function updateTotals() {
  const subtotalEl = document.getElementById('subtotal');
  const finalEl = document.getElementById('finalTotal');

  let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let total = subtotal;

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (finalEl) finalEl.textContent = formatMoney(total);
}

function formatMoney(amount, symbol = '₹') {
  const numeric = Number(amount || 0);
  if (Number.isNaN(numeric)) return `${symbol}0.00`;
  return `${symbol}${numeric.toFixed(2)}`;
}

async function generateOrderNumber() {
  const now = new Date();
  const timestampKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}` +
    `_${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  let hash = 0;
  for (let i = 0; i < timestampKey.length; i++) {
    hash = ((hash << 5) - hash) + timestampKey.charCodeAt(i);
    hash = hash & hash;
  }

  let candidate = String(Math.abs(hash) % 900000 + 100000);
  let tries = 0;

  while (tries < 20) {
    const q = query(collection(db, 'advanceOrders'), where('orderNo', '==', candidate));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return candidate;
    }

    // Already in use by an active order. Try next possible number.
    candidate = String((Number(candidate) % 999999) + 1).padStart(6, '0');
    tries += 1;
  }

  // Last resort stable fallback.
  return String(Date.now());
}

function setupEventForm() {
  const form = document.getElementById('eventForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const request = {
      id: Date.now(),
      name: document.getElementById('eventName').value.trim(),
      phone: document.getElementById('eventPhone').value.trim(),
      email: document.getElementById('eventEmail').value.trim(),
      type: document.getElementById('eventType').value,
      date: document.getElementById('eventDate').value,
      guests: document.getElementById('eventGuests').value,
      cake: document.getElementById('eventCake').value.trim(),
      note: document.getElementById('eventNote').value.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'eventBookings'), request);
    } catch (err) {
      console.error('Error saving event booking:', err);
      alert('Unable to save event booking right now. Please try again.');
      return;
    }

    form.reset();
    const success = document.getElementById('eventSuccess');
    if (success) success.textContent = 'Your event request has been received. The bakery will contact you soon.';
    setTimeout(() => { if (success) success.textContent = ''; }, 5000);

    if (window.location.pathname.endsWith('/sunshine86admin.html')) return;
  });
}

function setupOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cart.length) {
      alert('Cart is empty. Add products first.');
      return;
    }

    const orderNo = await generateOrderNumber();
    const cartForOrder = cart.map(item => {
      const product = products.find(p => p.id === item.id) || item;
      return {
        id: item.id,
        name: item.name,
        price: product.price,
        quantity: item.quantity,
        deliveryMethod: item.deliveryMethod || 'on-spot'
      };
    });

    const subtotal = cartForOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;

    const order = {
      id: Date.now(),
      orderNo,
      name: document.getElementById('orderName').value.trim(),
      phone: document.getElementById('orderPhone').value.trim(),
      pickupDate: document.getElementById('pickupDate').value,
      pickupTime: document.getElementById('pickupTime').value,
      note: document.getElementById('orderNote').value.trim(),
      cart: cartForOrder,
      totals: {
        subtotal,
        total
      },
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'advanceOrders'), order);
    } catch (err) {
      console.error('Error saving advance order:', err);
      alert('Unable to place order right now. Please try again.');
      return;
    }



    const receiptId = order.orderNo;

    const orderTextLines = [];
    orderTextLines.push(`Sunshine Bakery Receipt`);
    orderTextLines.push(`Order No: ${receiptId}`);
    orderTextLines.push(`Date: ${new Date().toLocaleString()}`);
    orderTextLines.push('');
    orderTextLines.push(`Customer: ${order.name}`);
    orderTextLines.push(`Phone: ${order.phone}`);
    orderTextLines.push(`Pickup Date/Time: ${order.pickupDate} ${order.pickupTime}`);
    orderTextLines.push(`Special Request: ${order.note || 'None'}`);
    orderTextLines.push('');
    orderTextLines.push('Items:');
    order.cart.forEach(item => {
      const itemMethod = item.deliveryMethod === 'parcel' ? 'Parcel' : 'On Spot';
      orderTextLines.push(`- ${item.name} x${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(item.price * item.quantity)} (${itemMethod})`);
    });

    orderTextLines.push('');
    orderTextLines.push(`Subtotal: ${formatMoney(order.totals.subtotal)}`);
    orderTextLines.push(`Total: ${formatMoney(order.totals.total)}`);
    orderTextLines.push('');
    orderTextLines.push('Thank you for ordering from Sunshine Bakery. Enjoy your treats!');

    latestOrderReceipt = order;
    latestReceiptId = receiptId;

    const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
    if (downloadReceiptBtn) {
      downloadReceiptBtn.style.display = 'block';
      downloadReceiptBtn.disabled = false;
    }

    cart = [];
    saveCart();
    renderProducts();
    renderCart();

    form.reset();
    const success = document.getElementById('orderSuccess');
    if (success) success.textContent = `Order Confirmed (Order No: ${receiptId}). Please collect your order at your selected time.`;
    setTimeout(() => { if (success) success.textContent = ''; }, 7000);
  });
}

async function setupAdminPage() {
  applyBakerySettings();
  await populateBakeryAdminForm();
  setupBakeryAdminSave();
  await populateAdminCredentialsForm();
  setupAdminCredentialSave();
  populateProductAdmin();
  loadOrderList();
  loadEventList();

  startFirestoreProductSync();

  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // optional: if you want to keep logout for UX, reset sensitive fields only
      const adminNumberEl = document.getElementById('adminNumber');
      const adminPasswordEl = document.getElementById('adminPassword');
      if (adminNumberEl) adminNumberEl.value = '';
      if (adminPasswordEl) adminPasswordEl.value = '';
      alert('Logged out. Admin page remains accessible without auth.');
    });
  }

  const form = document.getElementById('productForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('newProductName').value.trim();
      const price = parseFloat(document.getElementById('newProductPrice').value);
      const stock = parseInt(document.getElementById('newProductStock').value, 10);
      const image = document.getElementById('newProductImage').value.trim();
      if (name && !Number.isNaN(price) && !Number.isNaN(stock) && image) {
        const newItem = {
          id: Date.now(),
          name,
          price,
          stock,
          image
        };
        products.push(newItem);
        saveProducts();
        populateProductAdmin();
        form.reset();
      }
    });
  }
}

function populateProductAdmin() {
  const list = document.getElementById('productList');
  if (!list) return;
  list.innerHTML = '';

  console.log('populateProductAdmin', products.length, products.map(p => p.name));

  products.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <h4>${item.name}</h4>
      <p>Price: ₹<span class="price-text">${item.price.toFixed(2)}</span></p>
      <div class="admin-controls">
        <button class="admin-btn btn-edit" data-action="edit" data-id="${item.id}">Edit</button>
        <button class="admin-btn btn-delete" data-action="delete" data-id="${item.id}">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('button[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);
    btn.addEventListener('click', () => {
      if (action === 'delete') {
        products = products.filter(p => p.id !== id);
        saveProducts();
        populateProductAdmin();
        renderProducts();
      } else if (action === 'edit') {
        const target = products.find(p => p.id === id);
        if (!target) return;
        const newPrice = parseFloat(prompt('Set new price', target.price));
        const isInStock = confirm('Is this product IN STOCK? (OK=Yes, Cancel=No)');
        if (!Number.isNaN(newPrice)) target.price = newPrice;
        target.stock = isInStock ? 1 : 0;
        saveProducts();
        populateProductAdmin();
        renderProducts();
      }
    });
  });
}

function loadOrderList() {
  const orderList = document.getElementById('orderList');
  if (!orderList) return;
  orderList.innerHTML = '';

  const ordersQuery = query(collection(db, 'advanceOrders'), orderBy('createdAt', 'desc'));
  onSnapshot(ordersQuery, snapshot => {
    orderList.innerHTML = '';
    if (snapshot.empty) {
      orderList.innerHTML = '<p>No advance orders yet.</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const order = { id: docSnap.id, ...docSnap.data() };
      const docId = docSnap.id;
      const item = document.createElement('div');
      item.className = 'admin-item';

      const header = document.createElement('div');
      header.className = 'admin-item-header';
      header.innerHTML = `
        <button class="btn btn-link order-number-btn" type="button">Order #${order.orderNo}</button>
        <span>${order.name} — ${order.pickupDate} @ ${order.pickupTime}</span>
      `;

      const summary = document.createElement('p');
      summary.innerHTML = `Phone: ${order.phone}<br />Items: ${order.cart.map(i => `${i.name} (x${i.quantity}${i.deliveryMethod === 'parcel' ? ' - Parcel' : ' - On Spot'})`).join(', ')}<br />Total: ${formatMoney(order.totals.total)}`;

      const detailSection = document.createElement('div');
      detailSection.className = 'order-details';
      detailSection.style.display = 'none';
      detailSection.innerHTML = `
        <p>Pickup Date/Time: ${order.pickupDate} ${order.pickupTime}</p>
        <p>Note: ${order.note || 'None'}</p>
        <ul>${order.cart.map(i => `<li>${i.name} x${i.quantity} @ ${formatMoney(i.price)} ${i.deliveryMethod === 'parcel' ? '(Parcel)' : '(On Spot)'}</li>`).join('')}</ul>
        <p>Subtotal: ${formatMoney(order.totals.subtotal)}</p>
        <p>Total: ${formatMoney(order.totals.total)}</p>
        <button class="btn btn-secondary order-delivered-btn" type="button">Order Delivered</button>
      `;

      item.appendChild(header);
      item.appendChild(summary);
      item.appendChild(detailSection);
      orderList.appendChild(item);

      header.querySelector('.order-number-btn').addEventListener('click', () => {
        detailSection.style.display = detailSection.style.display === 'none' ? 'block' : 'none';
      });

      detailSection.querySelector('.order-delivered-btn').addEventListener('click', async () => {
        const confirmed = confirm(`Mark Order #${order.orderNo} as delivered?`);
        if (!confirmed) return;

        if (!docId) {
          console.error('Firestore document ID is missing, cannot delete order', order);
          alert('Unable to mark order delivered: missing record key. Please refresh.');
          return;
        }

        try {
          await deleteDoc(doc(db, 'advanceOrders', docId));
          // remove from UI immediately if deletion succeeded
          orderList.removeChild(item);
        } catch (err) {
          console.error('Error deleting order', err);
          alert('Unable to mark order delivered. Please try again.');
        }
      });
    });
  }, err => {
    console.error('Failed to subscribe to orders', err);
    orderList.innerHTML = '<p>Could not load orders. Please refresh.</p>';
  });
}

function loadEventList() {
  const eventList = document.getElementById('eventList');
  if (!eventList) return;
  eventList.innerHTML = '';

  const eventsQuery = query(collection(db, 'eventBookings'), orderBy('createdAt', 'desc'));
  onSnapshot(eventsQuery, snapshot => {
    eventList.innerHTML = '';
    if (snapshot.empty) {
      eventList.innerHTML = '<p>No event bookings yet.</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const evt = { id: docSnap.id, ...docSnap.data() };
      const item = document.createElement('div');
      item.className = 'admin-item';
      item.innerHTML = `
        <h4>${evt.type} on ${evt.date} (${evt.guests} guests)</h4>
        <p>${evt.name} • ${evt.phone} • ${evt.email}</p>
        <p>Cake: ${evt.cake}</p>
        <p>Notes: ${evt.note || 'None'}</p>
        <div><button class="btn btn-secondary event-completed-btn" type="button">Event Completed</button></div>
      `;
      eventList.appendChild(item);

      item.querySelector('.event-completed-btn').addEventListener('click', async () => {
        if (!confirm(`Mark event booking for ${evt.name} on ${evt.date} as completed?`)) return;
        try {
          await deleteDoc(doc(db, 'eventBookings', evt.id));
        } catch (err) {
          console.error('Error deleting event booking', err);
          alert('Unable to update booking. Please try again.');
        }
      });
    });
  }, err => {
    console.error('Failed to subscribe to event bookings', err);
    eventList.innerHTML = '<p>Could not load event bookings. Please refresh.</p>';
  });
}

// Initialize based on page
(async () => {
  const isAdminPage = window.location.pathname.endsWith('sunshine86admin.html') ||
    window.location.pathname.endsWith('/sunshine86admin.html') ||
    window.location.pathname.endsWith('admin.html');

  if (isAdminPage) {
    console.log('Admin page detected');
    setupAdminAuth();
    if (checkAdminLogin()) {
      await setupAdminPage();
    }
  } else {
    console.log('Index page detected');
    await setupIndexPage();
  }
})();
