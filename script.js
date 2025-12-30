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
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = cols[i] || "");
        return obj;
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

function normalize(t) {
    return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    return url ? url.replace(/^"+|"+$/g, "") : DEFAULT_IMAGE;
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

function getBurgerCount(base) {
    return Object.values(getCart())
        .filter(i => i.nombre.startsWith(base))
        .reduce((s, i) => s + i.cantidad, 0);
}

/* ================= MODAL CARNES ================= */

function initMeatModal() {
    const modal = document.getElementById("meatModal");

    document.querySelectorAll(".meat-btn").forEach(btn => {
        btn.onclick = () => {
            const carnes = Number(btn.dataset.carnes);
            let extra = carnes === 2 ? CONFIG.EXTRA_DOBLE : carnes === 3 ? CONFIG.EXTRA_TRIPLE : 0;

            addToCart(
                `${pendingBurger.Nombre} (${carnes} carnes)`,
                Number(pendingBurger.Precio) + extra
            );

            pendingBurger.counter.textContent =
                getBurgerCount(pendingBurger.Nombre);

            modal.classList.remove("active");
            document.body.classList.remove("modal-open");
        };
    });

    document.getElementById("cancelMeat").onclick = () => {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    };
}

/* ================= MODAL IMAGEN ================= */

const imgModal = document.getElementById("imageModal");
const img = document.getElementById("modalImage");

document.getElementById("closeModal").onclick = closeImg;
imgModal.onclick = e => e.target === imgModal && closeImg();

function openModal(src) {
    img.src = src;
    imgModal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeImg() {
    imgModal.classList.remove("active");
    img.src = "";
    document.body.classList.remove("modal-open");
}

/* ================= RENDER ================= */

function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;
        if (normalize(item.Categoria) === "config") return;

        const cont = document.querySelector(`#${normalize(item.Categoria)} .productos`);
        if (!cont) return;

        const div = document.createElement("div");
        div.className = "producto";
        div.innerHTML = `
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

        const counter = div.querySelector(".cantidad");

        div.querySelector(".mas").onclick = () => {
            if (normalize(item.Categoria) === "hamburguesas") {
                pendingBurger = { ...item, counter };

                document.querySelector('[data-carnes="1"] .meat-price').textContent =
                    `$${item.Precio}`;
                document.querySelector('[data-carnes="2"] .meat-price').textContent =
                    `+$${CONFIG.EXTRA_DOBLE} → $${+item.Precio + CONFIG.EXTRA_DOBLE}`;
                document.querySelector('[data-carnes="3"] .meat-price').textContent =
                    `+$${CONFIG.EXTRA_TRIPLE} → $${+item.Precio + CONFIG.EXTRA_TRIPLE}`;

                document.getElementById("meatModal").classList.add("active");
                document.body.classList.add("modal-open");
            } else {
                addToCart(item.Nombre, Number(item.Precio));
                counter.textContent = getCart()[item.Nombre]?.cantidad || 0;
            }
        };

        div.querySelector(".menos").onclick = () => {
            removeFromCart(item.Nombre);
            counter.textContent = getCart()[item.Nombre]?.cantidad || 0;
        };

        div.querySelector("img").onclick = () => openModal(driveToImageUrl(item.Imagen));

        cont.appendChild(div);
    });
}

/* ================= WHATSAPP ================= */

function initWhatsappButton() {
    document.querySelector(".whatsapp-float").onclick = e => {
        e.preventDefault();
        if (!Object.keys(getCart()).length) return alert("No agregaste productos.");
        document.getElementById("deliveryModal").classList.add("active");
        document.body.classList.add("modal-open");
    };

    btnConDelivery.onclick = () => enviarPedido("Con delivery");
    btnTakeAway.onclick = () => enviarPedido("Take away");
}

function enviarPedido(tipo) {
    const cart = Object.values(getCart());
    let total = 0;
    let msg = "";

    cart.forEach(i => {
        total += i.precio * i.cantidad;
        msg += `• ${i.cantidad} x ${i.nombre}\n`;
    });

    localStorage.removeItem(CART_KEY);
    window.location.href =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            `Hola 👋\n\n${msg}\nTotal: $${total}\nEntrega: ${tipo}`
        )}`;
}
