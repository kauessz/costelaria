// js/main.js
import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let cart = [];
window.cart = cart;
window.isStoreOpen = true;
window.menuItemsData = [];

// --- Escutadores Firebase ---
onSnapshot(doc(db, "config", "storeStatus"), (docSnap) => {
    const storeStatus = docSnap.data();
    const storeClosedMessage = document.getElementById('store-closed-message');
    window.isStoreOpen = storeStatus.acceptingOrders;
    storeClosedMessage.style.display = window.isStoreOpen ? 'none' : 'block';
    if (window.menuItemsData) window.renderMenu(window.menuItemsData);
});

onSnapshot(collection(db, "menuItems"), (snapshot) => {
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    window.menuItemsData = items;
    window.renderMenu(items);
});

// --- Pedido ---
window.saveAndSendOrder = async function() {
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const consent = document.getElementById('lgpd-consent').checked;
    const day = document.querySelector('input[name="day"]:checked');
    const time = document.getElementById('delivery-time').value;

    if (!name || !phone || !day || !time || !consent || cart.length === 0) {
        showModal("Preencha todos os campos e adicione itens ao carrinho.");
        return;
    }

    const orderData = {
        customer: { name, phone },
        items: cart,
        schedule: { day: day.value, time },
        totalEstimated: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
        status: "Pendente",
        createdAt: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, "pedidos"), orderData);
        console.log("Pedido salvo: ", docRef.id);
        sendToWhatsApp(orderData);
        cart = [];
        renderCart();
        toggleCart(false);
        showModal("Pedido enviado com sucesso!");
    } catch (e) {
        console.error("Erro: ", e);
        showModal("Erro ao salvar pedido. Tente novamente.");
    }
};

function sendToWhatsApp(order) {
    const phoneNumber = '5513997898957';
    let msg = `Olá! Sou *${order.customer.name}* e gostaria de um orçamento.\n`;
    order.items.forEach(i => msg += `*${i.quantity}x* - ${i.name}\n`);
    msg += `\n*Total Estimado:* ~R$ ${order.totalEstimated.toFixed(2)}\n`;
    msg += `*Dia:* ${order.schedule.day}\n*Horário:* ${order.schedule.time}`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- Carrinho, Renderização e Utilitários ---
window.toggleCart = function(forceState) {
    document.getElementById('cart-container').classList.toggle('active', forceState);
}

window.renderCart = function() {
    const el = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const countEl = document.getElementById('cart-item-count');
    const empty = document.getElementById('empty-cart-message');
    const footer = document.getElementById('cart-footer');

    let total = 0, totalItems = 0;
    if (cart.length === 0) {
        empty.style.display = 'block';
        el.style.display = 'none';
        footer.style.display = 'none';
        countEl.textContent = '0';
        return;
    }

    empty.style.display = 'none';
    el.style.display = 'block';
    footer.style.display = 'block';
    el.innerHTML = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        totalItems += item.quantity;
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-white cart-item-enter';
        div.innerHTML = `
            <div class="flex-grow pr-2">
                <span class="font-semibold">${item.quantity}x</span> ${item.name}
            </div>
            <div class="flex items-center gap-3">
                <button onclick="updateQuantity('${item.id}', -1)" class="bg-gray-700 w-6 h-6 rounded-full">-</button>
                <button onclick="updateQuantity('${item.id}', 1)" class="bg-gray-700 w-6 h-6 rounded-full">+</button>
            </div>
            <p class="font-semibold w-24 text-right">~ R$ ${itemTotal.toFixed(2)}</p>
        `;
        el.appendChild(div);
    });

    totalEl.textContent = `R$ ${total.toFixed(2)}`;
    countEl.textContent = totalItems;
};

window.updateQuantity = function(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== itemId);
    }
    renderCart();
};

window.showModal = function(message) {
    const modal = document.getElementById('warning-modal');
    document.getElementById('modal-message').textContent = message;
    modal.style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('warning-modal').style.display = 'none';
};