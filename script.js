// I have inserted your specific Firebase configuration details here.
const firebaseConfig = {
  apiKey: "AIzaSyDLNU2jvJEQ7f3YMiTH2a1sqb4pYO4HlLM",
  authDomain: "ganapati-542fa.firebaseapp.com",
  projectId: "ganapati-542fa",
  storageBucket: "ganapati-542fa.firebasestorage.app",
  messagingSenderId: "527468404547",
  appId: "1:527468404547:web:e653d86d1d8caf9bea59f6",
  measurementId: "G-BQPM8NFJJN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    let currentCart = [];

    const appContainer = document.getElementById('app');
    const authTemplate = document.getElementById('auth-template');
    const appShellTemplate = document.getElementById('app-shell-template');

    auth.onAuthStateChanged(user => user ? renderAppShell() : renderAuthScreen(true));
    
    function renderAuthScreen(isLogin) {
        appContainer.innerHTML = '';
        const authScreen = authTemplate.content.cloneNode(true);
        const authCard = authScreen.querySelector('#auth-card');
        if (isLogin) {
            authCard.innerHTML = `
                <div class="card-header"><h1>Login</h1></div>
                <div class="form-group"><label>Email</label><input type="email" id="login-email"></div>
                <div class="form-group"><label>Password</label><input type="password" id="login-password"></div>
                <button id="login-btn" class="primary full-width">Sign In</button>
                <p class="auth-toggle" id="show-register">Need an account? Register</p>
            `;
        } else {
            authCard.innerHTML = `
                <div class="card-header"><h1>Register</h1></div>
                <div class="form-group"><label>Email</label><input type="email" id="register-email"></div>
                <div class="form-group"><label>Password</label><input type="password" id="register-password"></div>
                <button id="register-btn" class="primary full-width">Create Account</button>
                <p class="auth-toggle" id="show-login">Already have an account? Login</p>
            `;
        }
        appContainer.appendChild(authScreen);
        setupAuthEventListeners();
    }
    
    function setupAuthEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            try { await auth.signInWithEmailAndPassword(email, password); } 
            catch (error) { alert(error.message); }
        });
        
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) registerBtn.addEventListener('click', async () => {
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            try { await auth.createUserWithEmailAndPassword(email, password); } 
            catch (error) { alert(error.message); }
        });

        const showRegister = document.getElementById('show-register');
        if(showRegister) showRegister.addEventListener('click', () => renderAuthScreen(false));
        const showLogin = document.getElementById('show-login');
        if(showLogin) showLogin.addEventListener('click', () => renderAuthScreen(true));
    }

    function renderAppShell() {
        appContainer.innerHTML = '';
        const appShell = appShellTemplate.content.cloneNode(true);
        appContainer.appendChild(appShell);
        setupNavLinks();
        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
        showPage('dashboard');
    }

    function showPage(pageId) {
        const mainContent = document.querySelector('.main-content');
        mainContent.innerHTML = ''; 
        
        const template = document.getElementById(`${pageId}-page-template`);
        if (template) {
            const pageContent = template.content.cloneNode(true);
            mainContent.appendChild(pageContent);

            if (pageId === 'dashboard') loadDashboardLogic();
            if (pageId === 'billing') loadBillingPageLogic();
            if (pageId === 'products') loadProductsPageLogic();
            if (pageId === 'customers') loadCustomersPageLogic();
            if (pageId === 'reports') loadReportsPageLogic();
        }
    }

    function setupNavLinks() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const pageId = link.getAttribute('href').substring(1);
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                showPage(pageId);
            });
        });
    }

    async function loadDashboardLogic() {
        const sales = await db.collection('sales').get();
        const products = await db.collection('products').get();
        const customers = await db.collection('customers').get();
        const totalRevenue = sales.docs.reduce((sum, doc) => sum + doc.data().grandTotal, 0);
        const lowStockCount = products.docs.filter(doc => doc.data().stock <= 10).length;
        document.getElementById('dashboard-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
        document.getElementById('dashboard-sales').textContent = sales.size;
        document.getElementById('dashboard-low-stock').textContent = lowStockCount;
        document.getElementById('dashboard-customers').textContent = customers.size;
        const recentSalesTable = document.querySelector('#recent-sales-table tbody');
        const recentSalesQuery = db.collection('sales').orderBy('createdAt', 'desc').limit(5);
        recentSalesQuery.onSnapshot(snapshot => {
             recentSalesTable.innerHTML = snapshot.docs.map(doc => `<tr>
                <td>${doc.id.substring(0,6)}...</td><td>${doc.data().customerName}</td>
                <td>₹${doc.data().grandTotal.toFixed(2)}</td><td>${new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString()}</td>
            </tr>`).join('') || `<tr><td colspan="4">No sales yet.</td></tr>`;
        });
    }

    function loadBillingPageLogic() {
        const productSelect = document.getElementById('billing-product-select');
        const customerSelect = document.getElementById('billing-customer-select');
        db.collection('products').where('stock', '>', 0).onSnapshot(snapshot => {
            productSelect.innerHTML = `<option value="">Select a Product</option>` + snapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().name} (Stock: ${doc.data().stock})</option>`).join('');
        });
        db.collection('customers').orderBy('name').onSnapshot(snapshot => {
            customerSelect.innerHTML = `<option value="Walk-in Customer">Walk-in Customer</option>` + snapshot.docs.map(doc => `<option value="${doc.data().name}">${doc.data().name}</option>`).join('');
        });
        document.getElementById('add-to-cart-btn').addEventListener('click', async () => {
            const productId = productSelect.value;
            if (!productId) return;
            const quantity = parseInt(document.getElementById('billing-quantity').value);
            const productDoc = await db.collection('products').doc(productId).get();
            if (!productDoc.exists) return alert('Product not found.');
            const productData = { id: productDoc.id, ...productDoc.data() };
            if (quantity > productData.stock) return alert('Not enough stock!');
            const existingItem = currentCart.find(item => item.id === productId);
            if (existingItem) {
                if (existingItem.quantity + quantity > productData.stock) return alert('Not enough stock for this quantity!');
                existingItem.quantity += quantity;
            } else {
                currentCart.push({ ...productData, quantity });
            }
            renderCart();
        });
        document.getElementById('finalize-sale-btn').addEventListener('click', finalizeSale);
    }

    function renderCart() {
        const cartTableBody = document.querySelector('#cart-items-table tbody');
        if(currentCart.length === 0) {
            cartTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cart is empty.</td></tr>`;
            document.getElementById('grand-total').textContent = `₹0.00`;
            return;
        }
        let grandTotal = 0;
        cartTableBody.innerHTML = currentCart.map((item, index) => {
            const total = item.price * item.quantity;
            grandTotal += total;
            return `<tr><td>${item.name}</td><td>₹${item.price.toFixed(2)}</td><td>${item.quantity}</td><td>₹${total.toFixed(2)}</td><td><button class="danger" onclick="window.removeFromCart(${index})">X</button></td></tr>`;
        }).join('');
        document.getElementById('grand-total').textContent = `₹${grandTotal.toFixed(2)}`;
    }
    
    window.removeFromCart = (index) => { currentCart.splice(index, 1); renderCart(); };
    
    async function finalizeSale() {
        if (currentCart.length === 0) return alert('Cart is empty!');
        const grandTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        showConfirmationModal('Are you sure you want to finalize this sale?', async () => {
            try {
                const sale = { customerName: document.getElementById('billing-customer-select').value, items: currentCart, grandTotal, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                await db.collection('sales').add(sale);
                const batch = db.batch();
                currentCart.forEach(item => {
                    const productRef = db.collection('products').doc(item.id);
                    batch.update(productRef, { stock: firebase.firestore.FieldValue.increment(-item.quantity) });
                });
                await batch.commit();
                alert('Sale finalized successfully!');
                currentCart = [];
                showPage('billing');
            } catch (error) {
                alert(`Error finalizing sale: ${error.message}`);
            }
        });
    }

    function loadProductsPageLogic() {
        const form = document.getElementById('add-product-form');
        const tableBody = document.querySelector('#products-page table tbody');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            await db.collection('products').add({ name: e.target.elements[0].value, category: e.target.elements[1].value, price: parseFloat(e.target.elements[2].value), stock: parseInt(e.target.elements[3].value) });
            form.reset();
        });
        db.collection('products').orderBy('name').onSnapshot(snapshot => {
            tableBody.innerHTML = snapshot.docs.map(doc => `<tr>
                <td>${doc.data().name}</td><td>${doc.data().category}</td><td>₹${doc.data().price.toFixed(2)}</td><td>${doc.data().stock}</td>
                <td><button class="danger" onclick="window.deleteDocument('products', '${doc.id}', '${doc.data().name.replace(/'/g, "\\'")}')">Delete</button></td>
            </tr>`).join('') || `<tr><td colspan="5">No products found.</td></tr>`;
        });
    }

    function loadCustomersPageLogic() {
        const form = document.getElementById('add-customer-form');
        const tableBody = document.querySelector('#customers-page table tbody');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            await db.collection('customers').add({ name: e.target.elements[0].value, mobile: e.target.elements[1].value, email: e.target.elements[2].value });
            form.reset();
        });
        db.collection('customers').orderBy('name').onSnapshot(snapshot => {
            tableBody.innerHTML = snapshot.docs.map(doc => `<tr>
                <td>${doc.data().name}</td><td>${doc.data().mobile}</td><td>${doc.data().email}</td>
                <td><button class="danger" onclick="window.deleteDocument('customers', '${doc.id}', '${doc.data().name.replace(/'/g, "\\'")}')">Delete</button></td>
            </tr>`).join('') || `<tr><td colspan="4">No customers found.</td></tr>`;
        });
    }

    async function loadReportsPageLogic() {
        const lowStockList = document.getElementById('low-stock-list');
        db.collection('products').where('stock', '<=', 10).onSnapshot(snapshot => {
            if (snapshot.empty) {
                lowStockList.innerHTML = '<li>All products have sufficient stock.</li>';
                return;
            }
            lowStockList.innerHTML = snapshot.docs.map(doc => `<li>${doc.data().name} - <strong>Stock: ${doc.data().stock}</strong></li>`).join('');
        });
    }

    window.deleteDocument = function(collection, id, name) {
        showConfirmationModal(`Are you sure you want to delete ${name || 'this item'}?`, () => {
            db.collection(collection).doc(id).delete();
        });
    };

    function showConfirmationModal(text, onConfirm) {
        const modal = document.getElementById('confirmation-modal');
        document.getElementById('modal-text').textContent = text;
        modal.classList.add('active');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newConfirmBtn.addEventListener('click', () => { onConfirm(); modal.classList.remove('active'); });
        newCancelBtn.addEventListener('click', () => { modal.classList.remove('active'); });
    }
});