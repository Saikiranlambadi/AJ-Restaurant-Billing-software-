// Client-side LocalStorage API wrapper for Restaurant Billing POS

const DEFAULT_CATEGORIES = [
  { id: 1, name: "STARTERS (VEG)" },
  { id: 2, name: "STARTERS (NON VEG)" },
  { id: 3, name: "VEG CURRYS" },
  { id: 4, name: "NON VEG" },
  { id: 5, name: "NAANS" },
  { id: 6, name: "BIRYANI VEG" },
  { id: 7, name: "NON VEG BIRYANI" }
];

const DEFAULT_ITEMS = [
  // STARTERS (VEG)
  { id: 1, name: "Veg Manchurian", category_id: 1, price: 150, available: 1, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80" },
  { id: 2, name: "Paneer Manchurian", category_id: 1, price: 240, available: 1, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80" },
  { id: 3, name: "Chilli Paneer", category_id: 1, price: 250, available: 1, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80" },
  { id: 4, name: "KFC Paneer", category_id: 1, price: 240, available: 1, image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80" },
  { id: 5, name: "Paneer Finger", category_id: 1, price: 240, available: 1, image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80" },
  { id: 6, name: "Paneer Tikka", category_id: 1, price: 250, available: 1, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80" },

  // STARTERS (NON VEG)
  { id: 7, name: "Chicken Tikka Full", category_id: 2, price: 250, available: 1, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80" },
  { id: 8, name: "Chicken Tikka Half", category_id: 2, price: 180, available: 1, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80" },
  { id: 9, name: "Tandoori Chicken", category_id: 2, price: 260, available: 1, image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80" },
  { id: 10, name: "Chicken KFC", category_id: 2, price: 250, available: 1, image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=80" },
  { id: 11, name: "Chilli Chicken", category_id: 2, price: 220, available: 1, image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=80" },
  { id: 12, name: "Chicken Manchurian", category_id: 2, price: 200, available: 1, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80" },
  { id: 13, name: "Chicken 65", category_id: 2, price: 200, available: 1, image: "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500&auto=format&fit=crop&q=80" },
  { id: 14, name: "Chicken Lollipop, 4 Piece", category_id: 2, price: 150, available: 1, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&auto=format&fit=crop&q=80" },
  { id: 15, name: "Chicken Lollipop, 7 Piece", category_id: 2, price: 250, available: 1, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&auto=format&fit=crop&q=80" },
  { id: 16, name: "Chicken Drumsticks", category_id: 2, price: 250, available: 1, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=500&auto=format&fit=crop&q=80" },

  // VEG CURRYS
  { id: 17, name: "Paneer Butter Masala", category_id: 3, price: 200, available: 1, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80" },
  { id: 18, name: "Kaju Paneer", category_id: 3, price: 250, available: 1, image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80" },
  { id: 19, name: "Kaju Curry", category_id: 3, price: 250, available: 1, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80" },
  { id: 20, name: "Palak Paneer", category_id: 3, price: 220, available: 1, image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80" },
  { id: 21, name: "Dal Tadka", category_id: 3, price: 130, available: 1, image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=500&auto=format&fit=crop&q=80" },
  { id: 22, name: "Dal Fry", category_id: 3, price: 120, available: 1, image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=500&auto=format&fit=crop&q=80" },
  { id: 23, name: "Kadai Paneer", category_id: 3, price: 220, available: 1, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },
  { id: 24, name: "Sai Paneer", category_id: 3, price: 200, available: 1, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80" },
  { id: 25, name: "Lemon Paneer", category_id: 3, price: 200, available: 1, image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80" },

  // NON VEG
  { id: 26, name: "Kadai Chicken", category_id: 4, price: 220, available: 1, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80" },
  { id: 27, name: "Butter Chicken", category_id: 4, price: 240, available: 1, image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80" },
  { id: 28, name: "Chicken Afghani", category_id: 4, price: 280, available: 1, image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80" },
  { id: 29, name: "Chicken Curry", category_id: 4, price: 200, available: 1, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80" },
  { id: 30, name: "Chicken Curry Boneless", category_id: 4, price: 220, available: 1, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80" },
  { id: 31, name: "Egg Fry, 3 Eggs", category_id: 4, price: 150, available: 1, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80" },

  // NAANS
  { id: 32, name: "Tandoori Roti", category_id: 5, price: 20, available: 1, image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80" },
  { id: 33, name: "Tandoori Butter Roti", category_id: 5, price: 40, available: 1, image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80" },
  { id: 34, name: "Tandoori Butter Naan", category_id: 5, price: 50, available: 1, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },
  { id: 35, name: "Plane Naan", category_id: 5, price: 30, available: 1, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },
  { id: 36, name: "Garlic Naan", category_id: 5, price: 60, available: 1, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },
  { id: 37, name: "Lacha Paratha", category_id: 5, price: 25, available: 1, image: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80" },
  { id: 38, name: "Paneer Naan", category_id: 5, price: 60, available: 1, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },

  // BIRYANI VEG
  { id: 39, name: "Veg Biryani", category_id: 6, price: 180, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 40, name: "Paneer Biryani", category_id: 6, price: 230, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 41, name: "Kaju Paneer Biryani", category_id: 6, price: 250, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },

  // NON VEG BIRYANI
  { id: 42, name: "Hyderabad Dum Biryani (Single)", category_id: 7, price: 150, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 43, name: "Hyderabad Dum Biryani (Full)", category_id: 7, price: 240, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 44, name: "Special Biryani (Single)", category_id: 7, price: 180, available: 1, image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80" },
  { id: 45, name: "Special Biryani (Full)", category_id: 7, price: 280, available: 1, image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80" },
  { id: 46, name: "Egg Biryani (Single)", category_id: 7, price: 120, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 47, name: "Egg Biryani (Full)", category_id: 7, price: 240, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 48, name: "Chicken Fry Piece Biryani (Single)", category_id: 7, price: 180, available: 1, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80" },
  { id: 49, name: "Chicken Fry Piece Biryani (Full)", category_id: 7, price: 280, available: 1, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80" },
  { id: 50, name: "Fish Biryani (Single)", category_id: 7, price: 200, available: 1, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80" },
  { id: 51, name: "Fish Biryani (Full)", category_id: 7, price: 320, available: 1, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80" },
  { id: 52, name: "Chicken Family Pack", category_id: 7, price: 480, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
  { id: 53, name: "Bahubali Biryani", category_id: 7, price: 800, available: 1, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" }
];

const DEFAULT_SETTINGS = {
  restaurant_name: "AJ Restaurant",
  address: "",
  phone: "",
  paper_size: "80mm"
};

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
}

// Seed initial data or update to new menu version
const MENU_VERSION = "v4_aj_billing";
if (localStorage.getItem("rb_menu_ver") !== MENU_VERSION) {
  setStorage("rb_categories", DEFAULT_CATEGORIES);
  setStorage("rb_items", DEFAULT_ITEMS);
  setStorage("rb_settings", DEFAULT_SETTINGS);
  setStorage("rb_menu_ver", MENU_VERSION);
}

if (!localStorage.getItem("rb_categories")) {
  setStorage("rb_categories", DEFAULT_CATEGORIES);
}
if (!localStorage.getItem("rb_items")) {
  setStorage("rb_items", DEFAULT_ITEMS);
}
if (!localStorage.getItem("rb_settings")) {
  setStorage("rb_settings", DEFAULT_SETTINGS);
}
if (!localStorage.getItem("rb_bills")) {
  setStorage("rb_bills", []);
}

// Categories
export async function getCategories() {
  return getStorage("rb_categories", DEFAULT_CATEGORIES);
}

export async function addCategory(name) {
  const categories = await getCategories();
  const nextId = categories.length ? Math.max(...categories.map(c => c.id)) + 1 : 1;
  const newCat = { id: nextId, name: name.trim() };
  categories.push(newCat);
  setStorage("rb_categories", categories);
  return newCat;
}

export async function editCategory(id, name) {
  const categories = await getCategories();
  const idx = categories.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    categories[idx].name = name.trim();
    setStorage("rb_categories", categories);
  }
  return categories[idx];
}

export async function deleteCategory(id) {
  let categories = await getCategories();
  categories = categories.filter(c => String(c.id) !== String(id));
  setStorage("rb_categories", categories);
  return { ok: true };
}

// Menu items
export async function getItems() {
  const items = getStorage("rb_items", DEFAULT_ITEMS);
  const categories = await getCategories();
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
  return items.map(item => ({
    ...item,
    category_name: catMap[item.category_id] || ""
  }));
}

export async function addItem(data) {
  const items = getStorage("rb_items", DEFAULT_ITEMS);
  const nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  const newItem = {
    id: nextId,
    name: data.name.trim(),
    category_id: data.category_id ? Number(data.category_id) : null,
    price: Number(data.price) || 0,
    available: data.available ? 1 : 0,
    image: data.image || ""
  };
  items.push(newItem);
  setStorage("rb_items", items);
  return newItem;
}

export async function editItem(id, data) {
  const items = getStorage("rb_items", DEFAULT_ITEMS);
  const idx = items.findIndex(i => String(i.id) === String(id));
  if (idx !== -1) {
    items[idx] = {
      ...items[idx],
      name: data.name.trim(),
      category_id: data.category_id ? Number(data.category_id) : null,
      price: Number(data.price) || 0,
      available: data.available ? 1 : 0,
      image: data.image !== undefined ? data.image : items[idx].image
    };
    setStorage("rb_items", items);
  }
  return items[idx];
}

export async function deleteItem(id) {
  let items = getStorage("rb_items", DEFAULT_ITEMS);
  items = items.filter(i => String(i.id) !== String(id));
  setStorage("rb_items", items);
  return { ok: true };
}

// Restaurant settings
export async function getSettings() {
  return getStorage("rb_settings", DEFAULT_SETTINGS);
}

export async function saveSettings(data) {
  const current = await getSettings();
  const updated = { ...current, ...data };
  setStorage("rb_settings", updated);
  return updated;
}

// Create bill
export async function createBill(data) {
  const bills = getStorage("rb_bills", []);
  const stamp = Date.now().toString(36).toUpperCase();
  const bill_no = `B${stamp}`;
  
  const total = (data.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const billItems = (data.items || []).map(item => ({
    item_id: item.id,
    item_name: item.name,
    quantity: item.quantity,
    price: item.price,
    amount: item.price * item.quantity
  }));

  const newBill = {
    id: bills.length ? Math.max(...bills.map(b => b.id)) + 1 : 1,
    bill_no,
    total,
    payment_method: data.payment_method || "Cash",
    cash_amount: Number(data.cash_amount) || 0,
    upi_amount: Number(data.upi_amount) || 0,
    card_amount: Number(data.card_amount) || 0,
    created_at: new Date().toISOString(),
    items: billItems
  };

  bills.unshift(newBill);
  setStorage("rb_bills", bills);
  return newBill;
}

// Get bills
export async function getBills() {
  return getStorage("rb_bills", []);
}

// Get single bill
export async function getBill(id) {
  const bills = await getBills();
  const bill = bills.find(b => String(b.id) === String(id));
  if (!bill) throw new Error("Bill not found");
  return bill;
}

// Delete bill
export async function deleteBill(id) {
  let bills = await getBills();
  bills = bills.filter(b => String(b.id) !== String(id));
  setStorage("rb_bills", bills);
  return { ok: true };
}

// Sales report
export async function getSalesReport() {
  const bills = await getBills();
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const todayBills = bills.filter(b => b.created_at && b.created_at.slice(0, 10) === todayStr);

  const summary = {
    total: 0,
    bills: todayBills.length,
    cash: 0,
    upi: 0,
    card: 0
  };

  const topMap = {};

  todayBills.forEach(b => {
    summary.total += Number(b.total) || 0;
    summary.cash += Number(b.cash_amount) || 0;
    summary.upi += Number(b.upi_amount) || 0;
    summary.card += Number(b.card_amount) || 0;

    (b.items || []).forEach(item => {
      if (!topMap[item.item_name]) {
        topMap[item.item_name] = { name: item.item_name, quantity: 0, amount: 0 };
      }
      topMap[item.item_name].quantity += item.quantity;
      topMap[item.item_name].amount += item.amount;
    });
  });

  const top = Object.values(topMap).sort((a, b) => b.quantity - a.quantity);

  return { summary, top };
}

// Owner Authentication
export async function login(username, password) {
  if (username.trim().toLowerCase() === "ajay" && password === "Ajay@1234") {
    const user = { username: "ajay", name: "Ajay", role: "Owner" };
    setStorage("rb_user", user);
    return user;
  }
  throw new Error("Invalid username or password");
}

export function getCurrentUser() {
  return getStorage("rb_user", null);
}

export function logout() {
  localStorage.removeItem("rb_user");
}

// Clear Data
export async function clearData(password) {
  setStorage("rb_bills", []);
  return { ok: true, message: "All data cleared successfully" };
}

export const api = {
  login,
  getCurrentUser,
  logout,
  categories: getCategories,
  addCategory,
  editCategory,
  deleteCategory,
  items: getItems,
  addItem,
  editItem,
  deleteItem,
  settings: getSettings,
  saveSettings,
  createBill,
  bills: getBills,
  bill: getBill,
  deleteBill,
  daily: getSalesReport,
  clearData
};

export default api;