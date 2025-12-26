const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "burgerbite_cart";

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
            initWhatsappButton();
            initPedidoModal();
        })
        .catch(() => {
            alert("No se pudo cargar la carta.");
        });
});

/* ================= CSV ================= */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') inQuotes = !inQuotes;
        else if (char === "," && !inQuotes) {
            row.push(current.trim());
            current = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (current || row.length) {
                row.push(current.trim());
                rows.push(row);
            }
            row = [];
            current = "";
        } else current += char;
    }

    if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
    }

    const headers = rows.shift();

    return rows.map(cols => {
        const item = {};
        headers.forEach((h, i) => item[h.trim()] = cols[i] || "");
        return item;
    });
}

/* ================= HELPERS ================= */
function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    if (!url) return "";
    const clean = url.replace(/^"+|"+$/g, "").trim();
    if (clean.includes("lh3.googleusercontent.com")) return clean;
    if (clean.includes("id=")) {
        return `https://lh3.googleusercontent.com/d/${clean.split("id=")[1]}`;
    }
    return clean;
}

/* ================= CART ================= */
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCart(item, delta) {
    const cart = getCart();
    const key = item.Nombre;

    if (!cart[key]) {
        cart[key] = {
            nombre: item.Nombre,
            precio: Number(item.Precio),
            cantidad: 0
        };
    }

    cart[key].cantidad += delta;

    if (cart[key].cantidad <= 0) delete cart[key];

    saveCart(cart);
    return cart[key]?.cantidad || 0;
}

/* ================= MODAL IMAGEN ================= */
const modalImgBox = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
document.getElementById("closeModal").onclick = () => closeImg();

function openModal(src) {
    modalImg.src = src;
    modalImgBox.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeImg() {
    modalImgBox.classList.remove("active");
    modalImg.src = "";
    document.body.classList.remove("modal-open");
}

/* ================= RENDER ================= */
function renderMenu(items) {
    const cart = getCart();

    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;

        const cont = document.querySelector(`#${normalize(item.Categoria)} .productos`);
        if (!cont) return;

        const imgSrc = item.Imagen ? driveToImageUrl(item.Imagen) : DEFAULT_IMAGE;
        const cant = cart[item.Nombre]?.cantidad || 0;

        const div = document.createElement("div");
        div.className = "producto";
        div.innerHTML = `
            <img src="${imgSrc}" alt="${item.Nombre}">
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>
                <div class="cantidad-control">
                    <button class="menos">−</button>
                    <span class="cantidad">${cant}</span>
                    <button class="mas">+</button>
                </div>
            </div>
        `;

        const img = div.querySelector("img");
        img.onerror = () => img.src = DEFAULT_IMAGE;
        img.onclick = () => openModal(imgSrc);

        const span = div.querySelector(".cantidad");
        div.querySelector(".mas").onclick = () => span.textContent = updateCart(item, 1);
        div.querySelector(".menos").onclick = () => span.textContent = updateCart(item, -1);

        cont.appendChild(div);
    });
}

/* ================= PEDIDO MODAL ================= */
const pedidoModal = document.getElementById("pedidoModal");
const confirmarBtn = document.getElementById("confirmarPedido");
const cancelarBtn = document.getElementById("cancelarPedido");

function initWhatsappButton() {
    document.querySelector(".whatsapp-float").onclick = e => {
        e.preventDefault();
        if (Object.keys(getCart()).length === 0) {
            alert("No agregaste ningún producto al pedido.");
            return;
        }
        pedidoModal.classList.add("active");
        document.body.classList.add("modal-open");
    };
}

function initPedidoModal() {
    cancelarBtn.onclick = () => closePedido();
    confirmarBtn.onclick = () => enviarPedido();
}

function closePedido() {
    pedidoModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

function enviarPedido() {
    const cart = Object.values(getCart());
    let total = 0;
    let detalle = "";

    cart.forEach(i => {
        total += i.precio * i.cantidad;
        detalle += `• ${i.cantidad} x ${i.nombre}\n`;
    });

    const delivery = document.querySelector("input[name='delivery']:checked").value;
    const nota = document.getElementById("notaPedido").value.trim();

    let mensaje = `
Hola 👋
Quería hacer el siguiente pedido:

${detalle}
Total: $${total}
Delivery: ${delivery}
    `.trim();

    if (nota) mensaje += `\nNota: ${nota}`;

    localStorage.removeItem(CART_KEY);
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}
