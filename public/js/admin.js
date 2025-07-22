// js/admin.js
import { db, auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  runTransaction,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutButton = document.getElementById('logout-button');
const storeStatusToggle = document.getElementById('store-status-toggle');
const storeStatusText = document.getElementById('store-status-text');
const ordersList = document.getElementById('orders-list');
const menuManagementList = document.getElementById('menu-management-list');
const confirmationModal = document.getElementById('confirmation-modal');
const finalPriceInput = document.getElementById('final-price-input');
const loginError = document.getElementById('login-error');

let allOrdersData = [];

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'block';
    initializeListeners();
  } else {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  loginError.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Email ou senha inválidos.";
    loginError.style.display = 'block';
  }
});

logoutButton.addEventListener('click', async () => {
  await signOut(auth);
});

function initializeListeners() {
  const storeStatusRef = doc(db, "config", "storeStatus");

  onSnapshot(storeStatusRef, (docSnap) => {
    const status = docSnap.data();
    storeStatusToggle.checked = status.acceptingOrders;
    storeStatusText.textContent = status.acceptingOrders ? 'Pedidos Abertos' : 'Pedidos Encerrados';
    storeStatusText.className = status.acceptingOrders ? 'text-sm font-medium text-green-400' : 'text-sm font-medium text-red-400';
  });

  storeStatusToggle.addEventListener('change', async (e) => {
    await setDoc(storeStatusRef, { acceptingOrders: e.target.checked });
  });

  onSnapshot(query(collection(db, "menuItems"), orderBy("order")), (snapshot) => {
    menuManagementList.innerHTML = '';
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const itemId = docSnap.id;
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 bg-gray-800/50 rounded-lg';
      div.innerHTML = `
        <div class="flex flex-col">
          <span class="text-white">${item.name}</span>
          <input type="number" value="${item.stock || 0}" onchange="updateItemStock('${itemId}', this.value)" class="bg-gray-700 text-white text-xs rounded w-20 p-1 mt-1">
        </div>
        <label class="switch">
          <input type="checkbox" onchange="updateItemAvailability('${itemId}', this.checked)" ${item.isAvailable ? 'checked' : ''}>
          <span class="slider"></span>
        </label>`;
      menuManagementList.appendChild(div);
    });
  });

  fetchOrders();
}

function fetchOrders() {
  onSnapshot(query(collection(db, "pedidos"), orderBy("createdAt", "desc")), (snapshot) => {
    allOrdersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderOrders(allOrdersData);
  });
}

window.updateItemAvailability = async (itemId, isAvailable) => {
  await updateDoc(doc(db, "menuItems", itemId), { isAvailable });
};

window.updateItemStock = async (itemId, stock) => {
  const value = parseInt(stock, 10);
  if (!isNaN(value)) await updateDoc(doc(db, "menuItems", itemId), { stock: value });
};

window.openConfirmationModal = (orderId) => {
  const order = allOrdersData.find(o => o.id === orderId);
  if (!order) return;
  confirmationModal.style.display = 'flex';
  document.getElementById('submit-confirm-button').onclick = () => confirmOrder(orderId);
  document.getElementById('cancel-confirm-button').onclick = () => confirmationModal.style.display = 'none';
};

async function confirmOrder(orderId) {
  const order = allOrdersData.find(o => o.id === orderId);
  const finalPrice = parseFloat(finalPriceInput.value);
  if (!order || isNaN(finalPrice) || finalPrice <= 0) {
    alert("Insira um valor válido."); return;
  }
  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, "pedidos", orderId);
      transaction.update(orderRef, { status: "Confirmado", finalPrice });

      for (const item of order.items) {
        const q = query(collection(db, "menuItems"), where("name", "==", item.name));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const menuItemDoc = snapshot.docs[0];
          const menuItemRef = doc(db, "menuItems", menuItemDoc.id);
          const currentStock = menuItemDoc.data().stock || 0;
          transaction.update(menuItemRef, { stock: currentStock - item.quantity });
        }
      }
    });
    confirmationModal.style.display = 'none';
    finalPriceInput.value = '';
    notifyCustomer(orderId);
  } catch (err) {
    console.error("Erro ao confirmar: ", err);
    alert("Erro ao confirmar pedido.");
  }
}

window.updateOrderStatus = async (orderId, newStatus) => {
  await updateDoc(doc(db, "pedidos", orderId), { status: newStatus });
};

window.notifyCustomer = (orderId) => {
  const order = allOrdersData.find(o => o.id === orderId);
  if (!order) return;
  const { customer, status, finalPrice, schedule } = order;
  let message = '';
  if (status === 'Confirmado') {
    message = `Olá, ${customer.name}! Seu pedido foi confirmado! Valor final: R$ ${finalPrice.toFixed(2)}.`;
  } else if (status === 'Pronto') {
    message = `Olá, ${customer.name}! Seu pedido está pronto! Retirada: ${schedule.day} às ${schedule.time}. Total: R$ ${finalPrice.toFixed(2)}.`;
  }
  const url = `https://wa.me/55${customer.phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};