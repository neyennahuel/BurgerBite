const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "burgerbite_cart";

/* ================= GLOBAL CONFIG ================= */
const CONFIG = {
    EXTRA_DOBLE: 0,
    EXTRA_TRIPLE: 0
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            loadConfig(data);
            renderMenu(data);
            initWhatsappButton();
        })
        .catch(() => alert("No se pudo cargar la carta."));
});

/* ================= CSV ================= */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let char of text) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === "," && !inQuotes) {
            row.push(current.trim());
            current = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (current || row.length) rows.push([...row, current.trim()]);
            row = [];
            current = "";
        } else current += char;
    }

    if (current || row.length) rows.push([...row, current.trim()]);

    const headers = rows.shift();
    return rows.map(cols => {
        const item = {};
        headers.forEach((h, i) => item[h.trim()] = cols[i] || "");
        return item;
    });
}

/* ================= CONFIG FROM CSV ================= */
function loadConfig(items) {
    items.forEach(item => {
        if (normalize(item.Categoria) === "config") {
            if (item.Nombre === "EXTRA_DOBLE") CONFIG.EXTRA_DOBLE = Number(item.Precio);
            if (item.Nombre === "EXTRA_TRIPLE") CONFIG.EXTRA_TRIPLE = Number(item.Precio);
        }
    });
}

/* ================= HELPERS ================= */
function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    if (!url) return DEFAULT_IMAGE;
    const clean = url.replace(/^"+|"+$/g, "").trim();
    if (clean.includes("lh3.googleusercontent.com")) return clean;
    if (clean.includes("id=")) return `https://lh3.googleusercontent.com/d/${clean.split("id=")[1]}`;
    return clean;
}

/* ================= CART ================= */
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(nombre, precio) {
    const cart = getCart();
    if (!cart[nombre]) cart[nombre] = { nombre, precio, cantidad: 0 };
    cart[nombre].cantidad += 1;
    saveCart(cart);
    return cart[nombre].cantidad;
}

function removeFromCart(nombre) {
    const cart = getCart();
    if (!cart[nombre]) return 0;
    cart[nombre].cantidad -= 1;
    if (cart[nombre].cantidad <= 0) delete cart[nombre];
    saveCart(cart);
    return cart[nombre]?.cantidad || 0;
}

/* ================= MODAL IMAGEN ================= */
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const closeBtn = document.getElementById("closeModal");

closeBtn.onclick = closeModal;
modal.onclick = e => e.target === modal && closeModal();

function openModal(src) {
    modalImg.src = src;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal() {
    modal.classList.remove("active");
    modalImg.src = "";
    document.body.classList.remove("modal-open");
}

/* ================= RENDER ================= */
function renderMenu(items) {
    const cart = getCart();

    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;
        if (normalize(item.Categoria) === "config") return;

        const contenedor = document.querySelector(`#${normalize(item.Categoria)} .productos`);
        if (!contenedor) return;

        const imgSrc = item.Imagen ? driveToImageUrl(item.Imagen) : DEFAULT_IMAGE;
        const producto = document.createElement("div");
        producto.className = "producto";

        producto.innerHTML = `
            <img src="${imgSrc}" alt="${item.Nombre}">
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>
                <div class="cantidad-control">
                    <button class="menos">−</button>
                    <span class="cantidad">0</span>
                    <button class="mas">+</button>
                </div>
            </div>
        `;

        const img = producto.querySelector("img");
        img.onerror = () => img.src = DEFAULT_IMAGE;
        img.onclick = e => { e.stopPropagation(); openModal(imgSrc); };

        const span = producto.querySelector(".cantidad");

        producto.querySelector(".mas").onclick = () => {
            if (normalize(item.Categoria) === "hamburguesas") {
                const carnes = prompt("¿Cuántas carnes? (1, 2 o 3)", "1");
                if (!["1", "2", "3"].includes(carnes)) return;

                let extra = 0;
                let label = "";

                if (carnes === "2") { extra = CONFIG.EXTRA_DOBLE; label = " (2 carnes)"; }
                if (carnes === "3") { extra = CONFIG.EXTRA_TRIPLE; label = " (3 carnes)"; }

                span.textContent = addToCart(
                    item.Nombre + label,
                    Number(item.Precio) + extra
                );
            } else {
                span.textContent = addToCart(item.Nombre, Number(item.Precio));
            }
        };

        producto.querySelector(".menos").onclick = () => {
            span.textContent = removeFromCart(item.Nombre);
        };

        contenedor.appendChild(producto);
    });
}

/* ================= WHATSAPP ================= */
function initWhatsappButton() {
    document.querySelector(".whatsapp-float").onclick = e => {
        e.preventDefault();
        if (!Object.keys(getCart()).length) {
            alert("No agregaste ningún producto.");
            return;
        }
        document.getElementById("deliveryModal").classList.add("active");
        document.body.classList.add("modal-open");
    };

    document.getElementById("btnConDelivery").onclick = () => enviarPedido("Con delivery");
    document.getElementById("btnTakeAway").onclick = () => enviarPedido("Take away");
}

function enviarPedido(tipoEntrega) {
    const items = Object.values(getCart());
    let total = 0;
    let detalle = "";

    items.forEach(i => {
        total += i.precio * i.cantidad;
        detalle += `• ${i.cantidad} x ${i.nombre}\n`;
    });

    const mensaje = `
Hola 👋
Quería hacer el siguiente pedido:

${detalle}
Total: $${total}
Entrega: ${tipoEntrega}
`.trim();

    localStorage.removeItem(CART_KEY);
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}
