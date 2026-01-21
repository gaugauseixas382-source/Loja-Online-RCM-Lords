// scripts.js - Lógica da loja online RCM Lords
// Implementa:
//  - Carregamento dinâmico de produtos e categorias via AJAX/JSON
//  - Filtros (categoria, pesquisa, ordenação)
//  - Lightbox para ver detalhes de um produto
//  - Formulário de cálculo de valor total com validação
//  - Carrinho simples: botão "Adicionar ao carrinho" soma os valores dos artigos
//  - Feedback ao utilizador e pequenas melhorias de UX

document.addEventListener("DOMContentLoaded", () => {
    const catalogUrl = "catalog.json";

    // Elementos do DOM
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const clearFiltersBtn = document.getElementById("clear-filters");
    const productList = document.getElementById("product-list");
    const loadingEl = document.getElementById("loading");
    const feedbackArea = document.getElementById("feedback-area");

    const productSelect = document.getElementById("product");
    const quantityInput = document.getElementById("quantity");
    const calculateBtn = document.getElementById("calculate");
    const totalValueEl = document.getElementById("total-value");
    const productErrorEl = document.getElementById("product-error");
    const quantityErrorEl = document.getElementById("quantity-error");

    const cartItemsEl = document.getElementById("cart-items");
    const cartTotalEl = document.getElementById("cart-total");

    const lightbox = document.getElementById("lightbox");
    const lightboxOverlay = lightbox.querySelector(".lightbox-overlay");
    const closeBtn = lightbox.querySelector(".close-btn");
    const lightboxTitle = document.getElementById("lightbox-title");
    const lightboxImage = document.getElementById("lightbox-image");
    const lightboxDescription = document.getElementById("lightbox-description");
    const lightboxPrice = document.getElementById("lightbox-price");
    const lightboxCategory = document.getElementById("lightbox-category");

    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Estado em memória
    let catalog = {
        categories: [],
        products: []
    };

    let filteredProducts = [];
    let cart = []; // carrinho simples

    // --------------------
    // Utilitários
    // --------------------

    function showLoading(show) {
        loadingEl.classList.toggle("hidden", !show);
    }

    function showFeedback(message, type = "success") {
        if (!feedbackArea) return;
        feedbackArea.innerHTML = "";
        if (!message) return;

        const p = document.createElement("p");
        p.textContent = message;
        p.classList.add(type);
        feedbackArea.appendChild(p);
    }

    function formatPrice(value) {
        const number = Number(value);
        if (Number.isNaN(number)) return "—";
        return number.toFixed(2).replace(".", ",") + " €";
    }

    function getCategoryNameById(id) {
        const cat = catalog.categories.find(c => c.id === id);
        return cat ? cat.name : "";
    }

    // --------------------
    // Carregamento AJAX
    // --------------------

    function loadCatalog() {
        showLoading(true);
        showFeedback("A carregar catálogo...", "success");

        fetch(catalogUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Não foi possível carregar o catálogo.");
                }
                return response.json();
            })
            .then(data => {
                catalog = data;
                filteredProducts = [...catalog.products];

                populateCategoryFilter(catalog.categories);
                populateProductSelect(catalog.products);
                renderProducts(filteredProducts);
                updateCartUI();

                showFeedback("Catálogo carregado com sucesso!", "success");
            })
            .catch(err => {
                console.error(err);
                showFeedback("Ocorreu um erro ao carregar o catálogo. Verifique o ficheiro catalog.json.", "error");
            })
            .finally(() => {
                showLoading(false);
            });
    }

    // --------------------
    // Construção de UI
    // --------------------

    function populateCategoryFilter(categories) {
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    }

    function populateProductSelect(products) {
        productSelect.innerHTML = '<option value="">-- Selecione um produto --</option>';
        products.forEach(prod => {
            const option = document.createElement("option");
            option.value = prod.id;
            option.textContent = `${prod.name} (${formatPrice(prod.price)})`;
            option.dataset.price = prod.price;
        });
    }

    function renderProducts(products) {
        productList.innerHTML = "";

        if (!products.length) {
            const p = document.createElement("p");
            p.textContent = "Nenhum produto encontrado com os filtros atuais.";
            productList.appendChild(p);
            return;
        }

        products.forEach(prod => {
            const card = document.createElement("article");
            card.classList.add("product-card", "animate__animated", "animate__fadeInUp");
            card.setAttribute("data-id", prod.id);

            const imageWrapper = document.createElement("div");
            imageWrapper.classList.add("product-image-wrapper");

            const img = document.createElement("img");
            img.src = prod.image;
            img.alt = prod.name;
            imageWrapper.appendChild(img);

            const info = document.createElement("div");
            info.classList.add("product-info");

            const titleRow = document.createElement("div");
            titleRow.classList.add("product-title-row");

            const title = document.createElement("h3");
            title.classList.add("product-title");
            title.textContent = prod.name;

            const catPill = document.createElement("span");
            catPill.classList.add("product-category-pill");
            catPill.textContent = getCategoryNameById(prod.category);

            titleRow.appendChild(title);
            titleRow.appendChild(catPill);

            const desc = document.createElement("p");
            desc.classList.add("product-description");
            desc.textContent = prod.description;

            const priceEl = document.createElement("p");
            priceEl.classList.add("product-price");
            priceEl.textContent = formatPrice(prod.price);

            const actions = document.createElement("div");
            actions.classList.add("product-actions");

            const detailsBtn = document.createElement("button");
            detailsBtn.classList.add("btn-outline");
            detailsBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Ver detalhes';
            detailsBtn.addEventListener("click", () => openLightbox(prod));

            const addToCartBtn = document.createElement("button");
            addToCartBtn.classList.add("btn-outline");
            addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Adicionar ao carrinho';
            addToCartBtn.addEventListener("click", () => {
                addToCart(prod);
            });

            actions.appendChild(detailsBtn);
            actions.appendChild(addToCartBtn);

            info.appendChild(titleRow);
            info.appendChild(desc);
            info.appendChild(priceEl);
            info.appendChild(actions);

            card.appendChild(imageWrapper);
            card.appendChild(info);

            productList.appendChild(card);
        });
    }

    // --------------------
    // Filtros e ordenação
    // --------------------

    function applyFilters() {
        const categoryValue = categoryFilter.value;
        const searchTerm = searchInput.value.trim().toLowerCase();
        const sortValue = sortSelect.value;

        let result = [...catalog.products];

        if (categoryValue) {
            result = result.filter(p => p.category === categoryValue);
        }

        if (searchTerm) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm)
            );
        }

        switch (sortValue) {
            case "price-asc":
                result.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case "price-desc":
                result.sort((a, b) => Number(b.price) - Number(a.price));
                break;
            case "name-asc":
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                break;
        }

        filteredProducts = result;
        renderProducts(filteredProducts);
    }

    // --------------------
    // Lightbox
    // --------------------

    function openLightbox(product) {
        lightboxTitle.textContent = product.name;
        lightboxImage.src = product.image;
        lightboxImage.alt = product.name;
        lightboxDescription.textContent = product.description;
        lightboxPrice.textContent = "Preço: " + formatPrice(product.price);
        lightboxCategory.textContent = "Categoria: " + getCategoryNameById(product.category);

        lightbox.classList.remove("hidden");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.classList.add("hidden");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    // --------------------
    // Validação e cálculo (formulário obrigatório no enunciado)
    // --------------------

    function clearErrors() {
        productErrorEl.textContent = "";
        quantityErrorEl.textContent = "";
        productSelect.classList.remove("is-invalid");
        quantityInput.classList.remove("is-invalid");
    }

    function validateForm() {
        clearErrors();
        let isValid = true;

        if (!productSelect.value) {
            productErrorEl.textContent = "Selecione um produto.";
            productSelect.classList.add("is-invalid");
            isValid = false;
        }

        const quantity = Number(quantityInput.value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            quantityErrorEl.textContent = "A quantidade deve ser um número positivo.";
            quantityInput.classList.add("is-invalid");
            isValid = false;
        }

        return isValid;
    }

    function calculateTotal() {
        if (!validateForm()) {
            totalValueEl.innerHTML = "";
            return;
        }

        const productId = productSelect.value;
        const product = catalog.products.find(p => p.id === productId);
        const quantity = Number(quantityInput.value);

        if (!product) {
            totalValueEl.innerHTML = "";
            return;
        }

        const price = Number(product.price);
        const total = price * quantity;

        const html = `
            Valor total para <span class="highlight">${quantity}x ${product.name}</span>:
            <span class="highlight">${formatPrice(total)}</span>
        `;

        totalValueEl.innerHTML = html;
        showFeedback("Cálculo realizado com sucesso.", "success");
    }

    // --------------------
    // Carrinho
    // --------------------

    function addToCart(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                quantity: 1
            });
        }
        updateCartUI();
        showFeedback(`"${product.name}" foi adicionado ao carrinho.`, "success");
    }

    function updateCartUI() {
        if (!cartItemsEl || !cartTotalEl) return;

        cartItemsEl.innerHTML = "";
        if (cart.length === 0) {
            const li = document.createElement("li");
            li.textContent = "O carrinho está vazio.";
            cartItemsEl.appendChild(li);
            cartTotalEl.textContent = "Total: 0,00 €";
            return;
        }

        let total = 0;
        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;

            const li = document.createElement("li");
            li.textContent = `${item.quantity}x ${item.name} — ${formatPrice(subtotal)}`;
            cartItemsEl.appendChild(li);
        });

        cartTotalEl.textContent = "Total: " + formatPrice(total);
    }

    // --------------------
    // Eventos
    // --------------------

    categoryFilter.addEventListener("change", applyFilters);
    searchInput.addEventListener("input", () => {
        clearTimeout(searchInput._debounce);
        searchInput._debounce = setTimeout(applyFilters, 200);
    });
    sortSelect.addEventListener("change", applyFilters);

    clearFiltersBtn.addEventListener("click", () => {
        categoryFilter.value = "";
        searchInput.value = "";
        sortSelect.value = "default";
        applyFilters();
        showFeedback("Filtros limpos.", "success");
    });

    calculateBtn.addEventListener("click", calculateTotal);

    productSelect.addEventListener("change", () => {
        clearErrors();
    });

    // Eventos do lightbox
    closeBtn.addEventListener("click", closeLightbox);
    lightboxOverlay.addEventListener("click", closeLightbox);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && lightbox.getAttribute("aria-hidden") === "false") {
            closeLightbox();
        }
    });

    // --------------------
    // Inicialização
    // --------------------

    loadCatalog();
});
