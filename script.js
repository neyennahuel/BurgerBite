const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "burgerbite_cart";

const CONFIG = {
    EXTRA_DOBLE: 0,
    EXTRA_TRIPLE: 0
};

let pendingBurger = null;

document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            loadConfig(data);
            renderMenu(data);
            initMeatModal();
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

/* ================= CONFIG ================= */

function loadConfig(items) {
    items.forEach(item => {
        if (normalize(item.Categoria) === "config") {
            if (item.Nombre === "EXTRA_DOBLE") CONFIG.EXTRA_DOBLE = Number(item.Precio);
            if (item.Nombre === "EXTRA_TRIPLE") CONFIG.EXTRA_TRIPLE = Number(item.Precio);
        }
    });
}

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    if (!url || url.trim() === "") return DEFAULT_IMAGE;
    return url.replace(/^"+|"+$/g, "").trim();
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
    cart[nombre].cantidad++;
    saveCart(cart);
}

function removeFromCart(nombre) {
    const cart = getCart();
    if (!cart[nombre]) return;
    cart[nombre].cantidad--;
    if (cart[nombre].cantidad <= 0) delete cart[nombre];
    saveCart(cart);
}

function removeOneBurger(nombreBase) {
    const cart = getCart();
    for (const key of Object.keys(cart)) {
        if (key.startsWith(nombreBase)) {
            cart[key].cantidad--;
            if (cart[key].cantidad <= 0) delete cart[key];
            break;
        }
    }
    saveCart(cart);
}

function getBurgerCount(nombreBase) {
    const cart = getCart();
    let total = 0;
    Object.values(cart).forEach(i => {
        if (i.nombre.startsWith(nombreBase)) total += i.cantidad;
    });
    return total;
}

/* ================= MODAL CARNES ================= */

function initMeatModal() {
    const modal = document.getElementById("meatModal");
    const cancel = document.getElementById("cancelMeat");

    document.querySelectorAll(".meat-btn").forEach(btn => {
        btn.classList.remove("destacada");
        if (btn.dataset.carnes === "3") btn.classList.add("destacada");

        btn.onclick = () => {
            const carnes = Number(btn.dataset.carnes);
            const extra =
                carnes === 2 ? CONFIG.EXTRA_DOBLE :
                carnes === 3 ? CONFIG.EXTRA_TRIPLE : 0;

            const tipo =
                carnes === 1 ? "Simple" :
                carnes === 2 ? "Doble" : "Triple";

            const nombreFinal = `${pendingBurger.Nombre} (${tipo})`;
            const precioFinal = Number(pendingBurger.Precio) + extra;

            addToCart(nombreFinal, precioFinal);
            pendingBurger.counter.textContent =
                getBurgerCount(pendingBurger.Nombre);

            modal.classList.remove("active");
            document.body.classList.remove("modal-open");
        };
    });

    cancel.onclick = () => {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    };
}

/* ================= MODAL IMAGEN ================= */

const modalImgBox = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const closeBtn = document.getElementById("closeModal");

closeBtn.onclick = closeModal;
modalImgBox.onclick = e => e.target === modalImgBox && closeModal();

function openModal(src) {
    modalImg.src = src;
    modalImgBox.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal() {
    modalImgBox.classList.remove("active");
    modalImg.src = "";
    document.body.classList.remove("modal-open");
}

/* ================= RENDER ================= */

function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;
        if (normalize(item.Categoria) === "config") return;

        const contenedor = document.querySelector(
            `#${normalize(item.Categoria)} .productos`
        );
        if (!contenedor) return;

        const producto = document.createElement("div");
        producto.className = "producto";

        producto.innerHTML = `
            <img src="${driveToImageUrl(item.Imagen)}">
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

        const span = producto.querySelector(".cantidad");

        producto.querySelector(".mas").onclick = () => {
            if (normalize(item.Categoria) === "hamburguesas") {
                pendingBurger = { ...item, counter: span };

                document.querySelector('[data-carnes="1"] .meat-price').textContent =
                    `Precio base $${item.Precio}`;
                document.querySelector('[data-carnes="2"] .meat-price').textContent =
                    `+ $${CONFIG.EXTRA_DOBLE} → $${Number(item.Precio) + CONFIG.EXTRA_DOBLE}`;
                document.querySelector('[data-carnes="3"] .meat-price').textContent =
                    `🔥 + $${CONFIG.EXTRA_TRIPLE} → $${Number(item.Precio) + CONFIG.EXTRA_TRIPLE}`;

                document.getElementById("meatModal").classList.add("active");
                document.body.classList.add("modal-open");
            } else {
                addToCart(item.Nombre, Number(item.Precio));
                span.textContent = getCart()[item.Nombre]?.cantidad || 0;
            }
        };

        producto.querySelector(".menos").onclick = () => {
            if (normalize(item.Categoria) === "hamburguesas") {
                removeOneBurger(item.Nombre);
                span.textContent = getBurgerCount(item.Nombre);
            } else {
                removeFromCart(item.Nombre);
                span.textContent = getCart()[item.Nombre]?.cantidad || 0;
            }
        };

        img.onclick = e => {
            e.stopPropagation();
            openModal(img.src);
        };

        contenedor.appendChild(producto);
    });
}

/* ================= WHATSAPP ================= */

const deliveryModal = document.getElementById("deliveryModal");
const deliveryCloseBtn = document.getElementById("closeDelivery");

function closeDeliveryModal() {
    deliveryModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

deliveryCloseBtn.onclick = closeDeliveryModal;
deliveryModal.onclick = e => e.target === deliveryModal && closeDeliveryModal();

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

    document.getElementById("btnConDelivery").onclick =
        () => enviarPedido("🛵 Con delivery");
    document.getElementById("btnTakeAway").onclick =
        () => enviarPedido("🏪 Take away");
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
    window.location.href =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}
