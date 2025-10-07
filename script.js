// Firebase Modular SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDLNU2jvJEQ7f3YMiTH2a1sqb4pYO4HlLM",
  authDomain: "ganapati-542fa.firebaseapp.com",
  projectId: "ganapati-542fa",
  storageBucket: "ganapati-542fa.firebasestorage.app",
  messagingSenderId: "527468404547",
  appId: "1:527468404547:web:e653d86d1d8caf9bea59f6",
  measurementId: "G-BQPM8NFJJN"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null, currentRole = "staff"; // role syncs on login

// Loader & Tick Animation
function showLoader(withTick=false) {
  const loader = document.getElementById('global-loader');
  loader.style.display = 'flex';
  loader.querySelector('.loader-spinner').style.display = withTick ? 'none' : 'block';
  const tick = loader.querySelector('.loader-tick');
  if(withTick) tick.classList.add('show'); else tick.classList.remove('show');
}
function hideLoader() {
  const loader = document.getElementById('global-loader');
  loader.style.display = 'none';
  loader.querySelector('.loader-tick').classList.remove('show');
}

// Auth/Login/Register (with simple admin role logic)
document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById('app');
  function renderAppShell() {
    appContainer.innerHTML = "";
    appContainer.appendChild(document.getElementById('app-shell-template').content.cloneNode(true));
    setupNavLinks();
    showPage("dashboard");
    document.getElementById('logout-btn').onclick = async () => {
      showLoader();
      await signOut(auth);
      hideLoader();
    };
  }
  function setupNavLinks() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        const id = link.getAttribute('href').substring(1);
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        showPage(id);
      };
    });
  }
  function showPage(id) {
    const main = document.querySelector('.main-content');
    main.innerHTML = '';
    const tpl = document.getElementById(`${id}-page-template`);
    if (tpl) main.appendChild(tpl.content.cloneNode(true));
    if (id === "products") loadProducts();
    if (id === "customers") loadCustomers();
    if (id === "billing") loadBilling();
    if (id === "dashboard") loadDashboard();
  }

  // Auth
  showLoader();
  onAuthStateChanged(auth, user => {
    hideLoader();
    if (user) {
      currentUser = user;
      // Assign role demo: emails ending with admin.com are admins
      currentRole = user.email.endsWith("admin.com") ? "admin" : "staff";
      renderAppShell();
    } else { showLogin(); }
  });

  function showLogin() {
    appContainer.innerHTML = "";
    appContainer.appendChild(document.getElementById("auth-template").content.cloneNode(true));
    const authForm = document.getElementById("auth-form");
    const toggleLink = document.getElementById("toggle-auth-link");
    const authTitle = document.getElementById("auth-title");
    const actionBtn = document.getElementById("auth-action-btn");
    const authMsg = document.getElementById("auth-message");
    let isLogin = true;
    authForm.onsubmit = async e => {
      e.preventDefault();
      showLoader();
      const email = document.getElementById("auth-email").value.trim();
      const pass = document.getElementById("auth-password").value.trim();
      try {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, pass);
        } else {
          await createUserWithEmailAndPassword(auth, email, pass);
        }
        hideLoader(); showLoader(true); setTimeout(hideLoader, 800);
      } catch(err) {
        hideLoader();
        authMsg.textContent = err.message;
      }
    };
    toggleLink.onclick = e => {
      e.preventDefault();
      isLogin = !isLogin;
      authTitle.textContent = isLogin ? "Login" : "Register";
      actionBtn.textContent = isLogin ? "Login" : "Register";
      toggleLink.textContent = isLogin ? "Switch to Register" : "Switch to Login";
      authMsg.textContent = "";
    };
  }

  // ------------------- PRODUCTS CRUD Module (Firestore) -------------------
  async function loadProducts() {
    const tb = document.getElementById("products-table").querySelector('tbody');
    const f = document.getElementById("product-form");
    f.onsubmit = async function(e){
      e.preventDefault();
      if (currentRole !== "admin") return alert("Admins only!");
      showLoader();
      await addDoc(collection(db, "products"), {
        name: document.getElementById("product-name").value,
        price: +document.getElementById("product-price").value,
        stock: +document.getElementById("product-stock").value,
        qr: document.getElementById("product-qr").value || ""
      });
      f.reset();
      hideLoader(); showLoader(true); setTimeout(hideLoader, 900);
      renderProducts();
    };
    tb.onclick = async e => {
      if(e.target.tagName === "BUTTON" && currentRole === "admin"){
        let idx = +e.target.closest("tr").getAttribute("data-idx");
        const docs = await getDocs(collection(db,"products"));
        let id = Array.from(docs.docs)[idx].id;
        showLoader();
        await deleteDoc(doc(db,"products",id));
        hideLoader(); showLoader(true); setTimeout(hideLoader, 900);
        renderProducts();
      }
    };
    async function renderProducts(){
      tb.innerHTML = ""; showLoader();
      const docs = await getDocs(collection(db,"products"));
      let i=0;
      docs.forEach(docu=>{
        let d=docu.data();
        tb.insertRow().outerHTML =
          `<tr data-idx="${i++}"><td>${d.name}</td><td>${d.price}</td><td>${d.stock}</td><td>${d.qr}</td><td><button>Del</button></td></tr>`;
      });
      hideLoader();
    }
    renderProducts();
  }

  // ------------------- CUSTOMER CRUD Module (Firestore) -------------------
  async function loadCustomers(){
    const tb=document.getElementById("customers-table").querySelector('tbody');
    const f=document.getElementById("customer-form");
    f.onsubmit = async function(e){
      e.preventDefault();
      showLoader();
      await addDoc(collection(db, "customers"), {
        name: document.getElementById("customer-name").value,
        email: document.getElementById("customer-email").value,
        points: 0
      });
      f.reset();
      hideLoader(); showLoader(true); setTimeout(hideLoader, 900);
      renderCustomers();
    };
    tb.onclick = async e => {
      if(e.target.tagName==="BUTTON" && currentRole==='admin'){
        let idx=+e.target.closest("tr").getAttribute("data-idx");
        const docs = await getDocs(collection(db,"customers"));
        let id = Array.from(docs.docs)[idx].id;
        showLoader();
        await deleteDoc(doc(db,"customers",id));
        hideLoader(); showLoader(true); setTimeout(hideLoader, 900);
        renderCustomers();
      }
    }
    async function renderCustomers(){
      tb.innerHTML = ""; showLoader();
      const docs = await getDocs(collection(db,"customers"));
      let i=0;
      docs.forEach(docu=>{
        let d=docu.data();
        tb.insertRow().outerHTML =
          `<tr data-idx="${i++}"><td>${d.name}</td><td>${d.email}</td><td>${d.points??0}</td><td><button>Del</button></td></tr>`;
      });
      hideLoader();
    }
    renderCustomers();
  }

  // ------------------- BILLING (Firestore + GST + loader) -------------------
  async function loadBilling(){
    // Fill select with products
    showLoader();
    const prodCol = await getDocs(collection(db,"products"));
    const prodArr = [];
    prodCol.forEach(doc=>{ let d=doc.data(); prodArr.push({id:doc.id,...d}); });
    let cart = [];
    const itemSel = document.getElementById("item");
    itemSel.innerHTML=prodArr.map(x=>`<option>${x.name}</option>`).join("");
    document.getElementById("add-item-btn").onclick=()=>{
      const name = itemSel.value;
      const quantity = +document.getElementById("quantity").value;
      const prod = prodArr.find(p=>p.name===name);
      if (!prod || prod.stock < quantity) return alert("Stock कम है!");
      cart.push({name: prod.name, quantity, price: prod.price, id:prod.id});
      prod.stock -= quantity;
      renderCart();
    };
    document.getElementById("scan-btn").onclick=e=>{
      e.preventDefault();
      let qr=prompt("Scan/Enter QR:");
      let prod = prodArr.find(p=>p.qr===qr);
      if(prod)itemSel.value=prod.name; else alert("QR/बारकोड नहीं मिला");
    };
    const cartTable = document.getElementById("cart-table").querySelector("tbody");
    function renderCart(){
      cartTable.innerHTML=""; let total=0;
      cart.forEach((c,idx)=>{
        let amt = c.quantity*c.price; total+=amt;
        cartTable.insertRow().innerHTML=`<td>${c.name}</td><td>${c.quantity}</td><td>${c.price}</td><td>${amt}</td><td><button onclick="removeCI(${idx})">X</button></td>`;
      });
      window.removeCI = idx => { let prod=prodArr.find(p=>p.name===cart[idx].name); if(prod)prod.stock+=cart[idx].quantity; cart.splice(idx,1);renderCart();}
      let gst = Math.round(total*0.18), net = total+gst;
      document.getElementById("bill-summary").innerHTML=`Total: ₹${total} | GST: ₹${gst} | <b>Pay: ₹${net}</b>`;
    }
    document.getElementById("checkout-btn").onclick=async ()=>{
      if(!cart.length)return alert("Cart empty!");
      let total=cart.reduce((s,c)=>s+c.quantity*c.price,0), gstAmt=Math.round(total*0.18);
      let net=total+gstAmt, mobile=document.getElementById("sms-mobile").value.trim();
      showLoader();
      // Save Sale
      await addDoc(collection(db,"sales"),{
        items: cart.map(x=>({...x})),
        total, gst:gstAmt, net,
        by: currentUser.email,
        date: new Date().toISOString()
      });
      // Update stock in db
      for(let c of cart){
        let newStock = prodArr.find(x=>x.id===c.id).stock;
        await updateDoc(doc(db,"products",c.id), {stock:newStock});
      }
      // SMS alert (demo)
      if(mobile.length===10) sendSMS(mobile, `आपका गणपति इलेक्ट्रॉनिक्स बिल: नेट ₹${net}`);
      cart=[];renderCart();
      hideLoader(); showLoader(true); setTimeout(hideLoader,1300);
    };
    document.getElementById("print-btn").onclick=()=>{billPrintView();setTimeout(()=>window.print(),350);}
    document.getElementById("pdf-btn").onclick=()=>{
      billPrintView();
      import('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js').then(html2pdf=>{
        html2pdf.default().from(document.getElementById("print-area")).save(`Bill-${Date.now()}.pdf`);
      });
    }
    function billPrintView(){
      let total=cart.reduce((s,c)=>s+c.quantity*c.price,0),gst=Math.round(total*0.18);
      let pa=document.getElementById("print-area");
      pa.style.display='block';
      pa.innerHTML = `<h3>गणपति इलेक्ट्रॉनिक्स<br/>Tax Invoice</h3>
      <table style="width:100%">
      <tr><th>प्रोडक्ट</th><th>Qty</th><th>Rate</th><th>Amt</th></tr>
      ${cart.map(c=>`<tr><td>${c.name}</td><td>${c.quantity}</td><td>${c.price}</td><td>${c.quantity*c.price}</td></tr>`).join("")}
      </table>
      <div>Subtotal: ₹${total}<br>GST (18%): ₹${Math.round(total*0.18)}<br>NET: ₹${Math.round(total*1.18)}</div>
      <div>धन्यवाद!</div>`;
      pa.style.display='none';
    }
    renderCart();
    hideLoader();
  }

  // ------------------- DASHBOARD -------------------
  async function loadDashboard(){
    showLoader();
    const [salesCol,prodCol,custCol] = await Promise.all([
      getDocs(collection(db,"sales")),
      getDocs(collection(db,"products")),
      getDocs(collection(db,"customers"))
    ]);
    document.getElementById('dash-sales').textContent = salesCol.size;
    let revenue = 0; salesCol.forEach(x=>{revenue+=x.data().net;});
    document.getElementById('dash-revenue').textContent = "₹" + revenue;
    let lowStock = 0; prodCol.forEach(x=>{if((x.data().stock??0)<10)lowStock++;});
    document.getElementById('dash-lowstock').textContent = lowStock;
    document.getElementById('dash-customers').textContent = custCol.size;
    hideLoader();
  }

  // ------------------- SMS Alert Placeholder -------------------
  function sendSMS(mobile, msg){
    alert("SMS भेजा गया (डेमो, असली API यहाँ लगाएँ!):\n" + mobile + "\n" + msg);
    // Put Twilio or other SMS API call here for production
  }

});
