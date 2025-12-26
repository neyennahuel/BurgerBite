const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "carrito_pedido";

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
            restoreCartUI();
        });
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
            if (row.length || current) {
                row.push(current.trim());
                rows.push(row);
            }
            row = [];
            current = "";
        } else current += char;
    }

    if (row.length || current) {
        row.push(current.trim());
        rows.push(row);
    }

    const headers = rows.shift();

    return rows.map(cols => {
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = cols[i] || "");
        return obj;
    });
}

/* ================= HELPERS ================= */

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    if (!url) return DEFAULT_IMAGE;
    if (url.includes("lh3.googleusercontent.com")) return url;
    if (url.includes("id=")) {
        const id = url.split("id=")[1];
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
}

/* ================= CARRITO ================= */

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateQuantity(item, delta) {
    const cart = getCart();
    const id = item.Nombre;

    cart[id] = cart[id] || { ...item, cantidad: 0 };
    cart[id].cantidad += delta;

    if (cart[id].cantidad <= 0) delete cart[id];

    saveCart(cart);
    updateUIQuantity(id, cart[id]?.cantidad || 0);
}

function updateUIQuantity(id, cantidad) {
    const span = document.querySelector(`[data-cantidad="${id}"]`);
    if (span) span.textContent = cantidad;
}

function restoreCartUI() {
    const cart = getCart();
    Object.values(cart).forEach(item => {
        updateUIQuantity(item.Nombre, item.cantidad);
    });
}

/* ================= WHATSAPP ================= */

function enviarPedidoWhatsapp() {
    const cart = getCart();
    if (!Object.keys(cart).length) {
        alert("No agregaste productos al pedido.");
        return;
    }

    const quiereDelivery = confirm(
        "¿Querés el pedido con delivery?\n\n(El precio con delivery se confirma luego de pasar la ubicación)"
    );

    let mensaje = "Hola 👋\nQuería pedir:\n\n";
    let total = 0;

    Object.values(cart).forEach(item => {
        const subtotal = item.cantidad * Number(item.Precio);
        total += subtotal;
        mensaje += `• ${item.cantidad} x ${item.Nombre}\n`;
    });

    mensaje += `\n💰 Total: $${total}\n`;
    mensaje += `🚚 Delivery: ${quiereDelivery ? "Sí" : "No"}`;

    localStorage.removeItem(CART_KEY);

    window.location.href =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

/* ================= RENDER ================= */

function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;

        const categoriaId = normalize(item.Categoria);
        const contenedor = document.querySelector(`#${categoriaId} .productos`);
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
                    <button>-</button>
                    <span class="cantidad" data-cantidad="${item.Nombre}">0</span>
                    <button>+</button>
                </div>
            </div>
        `;

        const [btnMenos, , btnMas] = producto.querySelectorAll("button");

        btnMas.onclick = () => updateQuantity(item, 1);
        btnMenos.onclick = () => updateQuantity(item, -1);

        contenedor.appendChild(producto);
    });
}

/* ================= BOTÓN FLOAT ================= */

document.querySelector(".whatsapp-float")
    .addEventListener("click", enviarPedidoWhatsapp);
