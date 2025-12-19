const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT8eU89XL7ucxbUaggrjgyWlnT6oDKMGRCL6SO7ywbM-ObzBueYGiVtYMHUx7PJ1fqJIrcrcuGcTG2g/pub?gid=0&single=true&output=csv";
const DEFAULT_IMAGE = "img/default.jpg";

document.addEventListener("DOMContentLoaded", () => {
    fetch(CSV_URL)
        .then(response => response.text())
        .then(text => {
            const data = parseCSV(text);
            renderMenu(data);
        })
        .catch(() => {
            alert("No se pudo cargar la carta. Intente nuevamente más tarde.");
        });
});

function parseCSV(text) {
    const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const headers = lines[0].split(",").map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(",");
        const item = {};

        headers.forEach((header, index) => {
            item[header] = values[index]?.trim() || "";
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

function renderMenu(items) {
    items.forEach(item => {
        if (item.Disponible !== "TRUE") return;

        const categoriaId = normalize(item.Categoria);
        const contenedor = document.querySelector(`#${categoriaId} .productos`);
        if (!contenedor) return;

        const producto = document.createElement("div");
        producto.className = "producto";

        const imgSrc = item.Imagen ? `img/${item.Imagen}` : DEFAULT_IMAGE;

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
