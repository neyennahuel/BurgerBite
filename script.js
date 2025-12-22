const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";

document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(res => res.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
        })
        .catch(err => {
            console.error(err);
            alert("No se pudo cargar la carta.");
        });
});

function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
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
            item[h] = cols[i] || "";
        });
        return item;
    });
}

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isValidUrl(url) {
    return /^https?:\/\//i.test(url);
}

function renderMenu(items) {
    items.forEach(item => {

        if (item.Disponible !== "TRUE") return;

        const categoriaId = normalize(item.Categoria);
        const contenedor = document.querySelector(`#${categoriaId} .productos`);
        if (!contenedor) return;

        const producto = document.createElement("div");
        producto.className = "producto";

        const imgSrc = (item.Imagen && isValidUrl(item.Imagen))
            ? item.Imagen
            : DEFAULT_IMAGE;

        producto.innerHTML = `
            <img src="${imgSrc}" alt="${item.Nombre}">
            <div class="info">
                <h3>${item.Nombre}</h3>
                <p>${item.Descripcion}</p>
                <span class="precio">$${item.Precio}</span>
            </div>
        `;

        const img = producto.querySelector("img");
        img.onerror = () => img.src = DEFAULT_IMAGE;

        contenedor.appendChild(producto);
    });
}
