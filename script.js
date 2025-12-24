const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";
const WHATSAPP_NUMBER = "5492634546537";

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
        })
        .catch(() => {
            alert("No se pudo cargar la carta.");
        });
});

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

function buildWhatsappLink(item) {
    const message = `
Hola 👋
Quiero pedir:

🍔 *${item.Nombre}*
💰 Precio: $${item.Precio}
📂 Categoría: ${item.Categoria}
    `.trim();

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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

        const whatsappLink = buildWhatsappLink(item);

        producto.innerHTML = `
            <img src="${imgSrc}" alt="${item.Nombre}">
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>

                <a 
                    href="${whatsappLink}"
                    target="_blank"
                    class="btn-pedir"
                >
                    Pedir por WhatsApp
                </a>
            </div>
        `;

        const img = producto.querySelector("img");
        img.onerror = () => img.src = DEFAULT_IMAGE;

        img.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal(imgSrc);
        });

        contenedor.appendChild(producto);
    });
}
