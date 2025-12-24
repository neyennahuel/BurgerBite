const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";
const CART_KEY = "burgerbite_cart";

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
            initWhatsappButton();
        })
        .catch(() => {
            alert("No se pudo cargar la carta.");
        });
});

/* ===== CART ===== */
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

    if (cart[key].cantidad <= 0) {
        delete cart[key];
    }

    saveCart(cart);
}

function getTotal(cart) {
    return Object.values(cart).reduce(
        (sum, p) => sum + p.precio * p.cantidad,
        0
    );
}

/* ===== CSV ===== */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            row.push(current.trim());
            current = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (current || row.length) {
                row.push(current.trim());
                rows.push(row);
            }
            row = [];
            current = "";
        } else {
            current += char;
        }
    }

    if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
    }

    const headers = rows.shift();

    return rows.map(cols => {
        const item = {};
        headers.forEach((h, i) => {
            item[h.trim()] = cols[i] || "";
        });
        return item;
    });
}

/* ===== HELPERS ===== */
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function driveToImageUrl(url) {
    if (!url) return "";
    const clean = url.replace(/^"+|"+$/g, "").trim();
    if (clean.includes("lh3.googleusercontent.com")) return clean;
    if (clean.includes("id=")) {
        const id = clean.split("id=")[1];
        return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return clean;
}

/* ===== WHATSAPP ===== */
function initWhatsappButton() {
    const btn = document.querySelector(".whatsapp-float");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
        const cart = getCart();
        if (Object.keys(cart).length === 0) {
            e.preventDefault();
            alert("No agregaste productos al carrito.");
            return;
        }

        let message = "Hola 👋\nQuería hacer el siguiente pedido:\n\n";

        Object.values(cart).forEach(p => {
            message += `• ${p.cantidad} x ${p.nombre}\n`;
        });

        const total = getTotal(cart);
        message += `\nTotal: $${total}`;

        localStorage.removeItem(CART_KEY);

        btn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    });
}

/* ===== MODAL ===== */
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");
const closeBtn = document.getElementById("closeModal");

closeBtn.addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

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

/* ===== RENDER ===== */
function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;

        const categoriaId = normalize(item.Categoria);
        const contenedor = document.querySelector(`#${categoriaId} .productos`);
        if (!contenedor) return;

        let imgSrc = DEFAULT_IMAGE;
        if (item.Imagen) imgSrc = driveToImageUrl(item.Imagen);

        const producto = document.createElement("div");
        producto.className = "producto";

        producto.innerHTML = `
            <img src="${imgSrc}" alt="${item.Nombre}">
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>

                <div class="cantidad-control">
                    <button class="btn-menos">−</button>
                    <span class="cantidad">0</span>
                    <button class="btn-mas">+</button>
                </div>
            </div>
        `;

        const img = producto.querySelector("img");
        img.onerror = () => img.src = DEFAULT_IMAGE;
        img.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal(imgSrc);
        });

        const btnMas = producto.querySelector(".btn-mas");
        const btnMenos = producto.querySelector(".btn-menos");
        const cantidadSpan = producto.querySelector(".cantidad");

        btnMas.addEventListener("click", () => {
            updateCart(item, 1);
            cantidadSpan.textContent = Number(cantidadSpan.textContent) + 1;
        });

        btnMenos.addEventListener("click", () => {
            if (Number(cantidadSpan.textContent) > 0) {
                updateCart(item, -1);
                cantidadSpan.textContent = Number(cantidadSpan.textContent) - 1;
            }
        });

        contenedor.appendChild(producto);
    });
}
