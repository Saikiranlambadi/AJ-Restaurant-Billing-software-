// AJ Billing cloud API client.
// Bills, menu items, categories and settings are stored in the shared PostgreSQL database.
// Only the temporary cart/theme/session remain in this browser.

const DEFAULT_CATEGORIES = [
  { id: 1, name: "STARTERS (VEG)" }, { id: 2, name: "STARTERS (NON VEG)" }, { id: 3, name: "VEG CURRYS" }, { id: 4, name: "NON VEG" },
  { id: 5, name: "NAANS" }, { id: 6, name: "BIRYANI VEG" }, { id: 7, name: "NON VEG BIRYANI" }, { id: 8, name: "BEVERAGES & COOL DRINKS" }
];
const DEFAULT_SETTINGS = { restaurant_name: "AJ Restaurant", address: "Main Road, Sudimalla, Telangana – 507123", phone: "📞 9866330527", paper_size: "80mm" };

const TOKEN_KEY = "rb_token";
const USER_KEY = "rb_user";
const LOCAL_MIGRATED_KEY = "rb_cloud_migrated_v1";

function token() { return localStorage.getItem(TOKEN_KEY) || ""; }
function getLocal(key, fallback) { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function headers(json=true) { const h={}; if(json) h["Content-Type"]="application/json"; if(token()) h.Authorization=`Bearer ${token()}`; return h; }

async function request(path, options={}) {
  const res = await fetch(`/api/${path}`, { ...options, headers: { ...headers(options.body !== undefined), ...(options.headers||{}) } });
  let body={}; try { body=await res.json(); } catch {}
  if(!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth-invalid"));
    }
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return body;
}

async function migrateOldBrowserData() {
  if (localStorage.getItem(LOCAL_MIGRATED_KEY)) return;
  const oldBills=getLocal("rb_bills",[]);
  const oldItems=getLocal("rb_items",[]);
  const oldCats=getLocal("rb_categories",DEFAULT_CATEGORIES);
  const oldSettings=getLocal("rb_settings",DEFAULT_SETTINGS);
  try {
    await request("sync", { method:"POST", body:JSON.stringify({ bills:oldBills, items:oldItems, categories:oldCats, settings:oldSettings }) });
    localStorage.setItem(LOCAL_MIGRATED_KEY,"1");
  } catch(e) { console.warn("Cloud migration will retry:",e.message); }
}

export async function login(username,password) {
  const data=await request("login",{method:"POST",body:JSON.stringify({username,password})});
  localStorage.setItem(TOKEN_KEY,data.token); localStorage.setItem(USER_KEY,JSON.stringify(data.user));
  await migrateOldBrowserData();
  return data.user;
}
export function getCurrentUser(){
  const t = localStorage.getItem(TOKEN_KEY);
  const u = getLocal(USER_KEY, null);
  if (!t || !u) return null;
  return u;
}
export function logout(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

export async function getCategories(){ return request("categories"); }
export async function addCategory(name){ return request("categories",{method:"POST",body:JSON.stringify({name})}); }
export async function editCategory(id,name){ return request(`categories/${id}`,{method:"PUT",body:JSON.stringify({name})}); }
export async function deleteCategory(id){ return request(`categories/${id}`,{method:"DELETE"}); }

export async function getItems(){ return request("items"); }
export async function addItem(data){ return request("items",{method:"POST",body:JSON.stringify(data)}); }
export async function editItem(id,data){ return request(`items/${id}`,{method:"PUT",body:JSON.stringify(data)}); }
export async function deleteItem(id){ return request(`items/${id}`,{method:"DELETE"}); }

export function getCart(){ return getLocal("rb_cart",[]); }
export function saveCart(cart){ localStorage.setItem("rb_cart",JSON.stringify(cart||[])); }

export async function getSettings(){ return request("settings"); }
export async function saveSettings(data){ return request("settings",{method:"PUT",body:JSON.stringify(data)}); }

export async function createBill(data){ return request("bills",{method:"POST",body:JSON.stringify(data)}); }
export async function getBills(){ return request("bills"); }
export async function getBill(id){ return request(`bills/${id}`); }
export async function deleteBill(id){ return request(`bills/${id}`,{method:"DELETE"}); }
export async function getSalesReport(){ return request("daily"); }
export async function clearData(password){ return request("clear",{method:"POST",body:JSON.stringify({password})}); }

export const api={login,getCurrentUser,logout,categories:getCategories,addCategory,editCategory,deleteCategory,items:getItems,addItem,editItem,deleteItem,settings:getSettings,saveSettings,createBill,bills:getBills,bill:getBill,deleteBill,daily:getSalesReport,clearData,getCart,saveCart};
