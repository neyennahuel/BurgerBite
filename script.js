const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "burgerbite_cart";

let EXTRAS = {
    doble: 0,
    triple: 0
};

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            cargarExtras(data);
            renderMenu(data);
            initWhatsappButton();
        })
        .catch(() => alert("No se pudo cargar la carta."));
});

/* ================= CONFIG EXTRAS ================= */
function cargarExtras(items) {
    items.forEach(item => {
        if (item.Categoria === "CONFIG") {
            if (item.Nombre === "EXTRA_DOBLE") EXTRAS.doble = Number(item.Precio);
            if (item.Nombre === "EXTRA_TRIPLE") EXTRAS.triple = Number(item.Precio);
        }
    });
}

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

/* ================= CART ================= */
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addBurgerToCart(item, carnes) {
    const cart = getCart();
    const key = `${item.Nombre}|${carnes}`;

    let precioFinal = Number(item.Precio);
    if (carnes === 2) precioFinal += EXTRAS.doble;
    if (carnes === 3) precioFinal += EXTRAS.triple;

    if (!cart[key]) {
        cart[key] = {
            nombre: item.Nombre,
            carnes,
            precio: precioFinal,
            cantidad: 0
        };
    }

    cart[key].cantidad += 1;
    saveCart(cart);
}

/* ================= RENDER ================= */
function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;
        if (item.Categoria === "CONFIG") return;

        const categoriaId = normalize(item.Categoria);
        const contenedor = document.querySelector(`#${categoriaId} .productos`);
        if (!contenedor) return;

        const producto = document.createElement("div");
        producto.className = "producto";

        producto.innerHTML = `
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>
                <button class="mas">+</button>
            </div>
        `;

        producto.querySelector(".mas").addEventListener("click", () => {
            if (normalize(item.Categoria) === "hamburguesas") {
                // acá luego conectamos el modal de carnes
                addBurgerToCart(item, 1);
            } else {
                addBurgerToCart(item, 1);
            }
        });

        contenedor.appendChild(producto);
    });
}

/* ================= WHATSAPP ================= */
function initWhatsappButton() {
    document.querySelector(".whatsapp-float").addEventListener("click", e => {
        e.preventDefault();

        const cart = getCart();
        if (!Object.keys(cart).length) {
            alert("No agregaste ningún producto.");
            return;
        }

        let detalle = "";
        let total = 0;

        Object.values(cart).forEach(item => {
            total += item.precio * item.cantidad;
            const carneTxt = item.carnes > 1 ? ` (${item.carnes} carnes)` : "";
            detalle += `• ${item.cantidad} x ${item.nombre}${carneTxt}\n`;
        });

        const mensaje = `
Hola 👋
Quería hacer el siguiente pedido:

${detalle}
Total: $${total}
`.trim();

        localStorage.removeItem(CART_KEY);
        window.location.href =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    });
}
