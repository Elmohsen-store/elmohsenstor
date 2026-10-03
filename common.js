const db = supabase.createClient(STORE_CONFIG.SUPABASE_URL, STORE_CONFIG.SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
const money = n => Number(n || 0).toLocaleString('ar-EG') + ' ج.م';
const CK = 'al_mohsen_cart';

const toast = m => {
    let x = $('toast');
    if (x) {
        x.textContent = m;
        x.style.display = 'block';
        setTimeout(() => x.style.display = 'none', 2000);
    }
};

async function session() { return (await db.auth.getSession()).data.session }
const ADMIN_UID = '909bc6ab-d966-49f3-b8e9-3b59d091868c';

async function me() {
    let s = await session();
    if (!s) return null;
    let r = (await db.from('profiles').select('*').eq('id', s.user.id).maybeSingle()).data;
    if (s.user.id === ADMIN_UID) return { ...(r || {}), id: s.user.id, account_type: 'admin', full_name: r?.full_name || s.user.email };
    return r;
}

async function guard() {
    let s = await session();
    if (!s) { location.href = 'login.html?next=' + encodeURIComponent(location.href); return null }
    return s;
}

async function logout() { await db.auth.signOut(); location.href = 'index.html'; }
function guest() { try { return JSON.parse(localStorage.getItem(CK) || '[]') } catch { return [] } }
function save(c) { localStorage.setItem(CK, JSON.stringify(c)) }

async function sync() {
    let s = await session();
    if (!s) return;
    for (const x of guest()) await db.from('cart_items').upsert({ user_id: s.user.id, product_id: x.id, quantity: x.qty }, { onConflict: 'user_id,product_id' });
    save([]);
}

async function cart() {
    let s = await session();
    if (!s) return guest();
    let { data } = await db.from('cart_items').select('id,product_id,quantity,products(id,name,price,image_url,stock)').eq('user_id', s.user.id);
    return (data || []).map(x => ({ ...x.products, qty: x.quantity, cart_id: x.id }));
}

async function add(id) {
    let s = await session();
    if (!s) {
        let c = guest(), x = c.find(x => String(x.id) === String(id));
        if (x) x.qty++;
        else {
            let { data, error } = await db.from('products').select('id,name,price,image_url,stock').eq('id', id).single();
            if (error || !data) return toast('تعذر العثور على المنتج');
            c.push({ ...data, qty: 1 });
        }
        save(c); toast('تمت الإضافة للسلة'); return;
    }
    let q = await db.from('cart_items').select('id,quantity').eq('user_id', s.user.id).eq('product_id', id).maybeSingle();
    if (q.error) return toast('تعذر الوصول إلى السلة: ' + q.error.message);
    let r = q.data ? await db.from('cart_items').update({ quantity: q.data.quantity + 1 }).eq('id', q.data.id) : await db.from('cart_items').insert({ user_id: s.user.id, product_id: id, quantity: 1 });
    if (r.error) return toast('تعذر إضافة المنتج: ' + r.error.message);
    toast('تمت الإضافة للسلة');
}

async function page() {
    let p = document.body.dataset.page || 'home';
    await sync();
    if (p === 'home') return home();
    if (p === 'product') return product();
    if (p === 'cart') return cartPage();
    if (p === 'checkout') return checkout();
    if (p === 'account') return account();
    if (p === 'buyer') return buyer();
    if (p === 'seller') return seller();
    if (p === 'admin') return admin();
    if (p === 'orders') return orders();
    if (p === 'order') return order();
    if (p === 'wishlist') return wishlist();
    if (p === 'addresses') return addresses();
    if (p === 'add-product') return addProduct();
    if (p === 'seller-products') return sellerProducts();
    if (p === 'seller-orders') return sellerOrders();
}

function layout(title, links = '') {
    document.title = title + ' - المحسن ستور';
    document.body.insertAdjacentHTML('afterbegin', `
        <button class="menu-toggle" type="button" aria-label="فتح القائمة" onclick="openSideMenu()">☰</button>
        <div class="side-overlay" onclick="closeSideMenu()"></div>
        <aside class="side-menu" id="sideMenu">
            <div class="side-head">
                <a href="index.html" class="side-brand"><img class="side-logo" src="logo.png" alt="المحسن ستور"></a>
                <button class="side-close" type="button" onclick="closeSideMenu()">×</button>
            </div>
            <nav class="side-links">
                <a href="index.html">🏠 الرئيسية</a>
                <a href="account.html">👤 حسابي / لوحة التحكم</a>
                <a href="buyer-dashboard.html">🛒 لوحة المشتري</a>
                <a href="seller-dashboard.html">🏪 لوحة البائع</a>
                <a href="index.html#categories">📂 الفئات</a>
                <a href="cart.html">🛒 السلة</a>
                <a href="wishlist.html">❤️ المفضلة</a>
                ${links}
            </nav>
        </aside>
    `);
}

function openSideMenu() { document.body.classList.add('menu-open') }
function closeSideMenu() { document.body.classList.remove('menu-open') }

async function home() {
    layout('المحسن ستور');
    document.querySelector('main').innerHTML = `<div class="top-strip">عروض مميزة • شحن سريع • تسوق آمن وسهل</div><header class="shop-header"><div class="header-inner"><a class="brand" href="index.html"><img src="logo.png" alt="المحسن ستور"></a><div class="search-box"><input id="search" placeholder="ابحث عن منتج..." oninput="filterProducts(this.value)"><button onclick="filterProducts(document.getElementById('search').value)">بحث</button></div><div class="header-actions"><a href="account.html">حسابي</a><a href="cart.html">🛒 السلة</a></div></div></header><section class="hero-shop"><div><span>مرحبًا بك</span><h1>تسوّق بسهولة من المحسن ستور</h1><p>اكتشف المنتجات واطلبها بسهولة.</p><a class="hero-btn" href="#products">تسوق الآن</a></div></section><section class="benefits"><div>🚚<b>شحن سريع</b><small>إلى جميع المحافظات</small></div><div>🔒<b>دفع آمن</b><small>خيارات دفع متعددة</small></div><div>↩️<b>سهولة الطلب</b><small>خطوات بسيطة</small></div><div>💬<b>دعم العملاء</b><small>نحن في خدمتك</small></div></section><section class="container shop-section" id="categories"><div class="section-title"><h2>تسوّق حسب القسم</h2><span>اختر القسم</span></div><div id="cats" class="category-row"></div></section><section class="container shop-section" id="products"><div class="section-title"><h2>منتجاتنا</h2><span id="product-count"></span></div><div id="products-grid" class="product-grid"></div></section>`;
    let { data, error } = await db.from('products').select('id,name,description,price,category,image_url,icon,stock').eq('is_active', true).order('created_at', { ascending: false });
    if (error) return $('products-grid').innerHTML = '<div class="empty">تعذر تحميل المنتجات.</div>';
    window.products = data || [];
    let cats = [...new Set(window.products.map(x => x.category).filter(Boolean))];
    $('cats').innerHTML = '<button class="cat-btn active" onclick="renderCat(\'كل المنتجات\',this)">كل المنتجات</button>' + cats.map(c => `<button class="cat-btn" onclick='renderCat(${JSON.stringify(c)},this)'>${esc(c)}</button>`).join('');
    renderCat('كل المنتجات');
}

function filterProducts(q) {
    let v = String(q || '').trim().toLowerCase();
    renderProductRows((window.products || []).filter(p => !v || String(p.name || '').toLowerCase().includes(v) || String(p.description || '').toLowerCase().includes(v)));
}

function renderCat(c, el) {
    document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
    if (el) el.classList.add('active');
    renderProductRows(c === 'كل المنتجات' ? (window.products || []) : (window.products || []).filter(x => x.category === c));
}

function renderProductRows(rows) {
    let grid = $('products-grid');
    if (!grid) return;
    $('product-count').textContent = `${rows.length} منتج`;
    grid.innerHTML = rows.map(p => `<article class="product-card"><a class="product-image-wrap" href="product.html?id=${encodeURIComponent(p.id)}"><img class="product-img" src="${esc(p.image_url || '')}" onerror="this.style.display='none'"><div class="fallback-icon">${esc(p.icon || '🛍️')}</div></a><div class="product-body"><a class="product-name" href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a><div class="price">${money(p.price)}</div><button class="cart-btn" onclick='add(${JSON.stringify(p.id)})'>أضف للسلة</button></div></article>`).join('') || '<div class="empty">لا توجد منتجات.</div>';
}

async function product() 
    layout('تفاصيل المنتج');
    let id = Q.get('id'), { data: p } = await db.from('products').select('*,profiles(full_name,store_name)').eq('id', id).single();
    if (!p) { document.querySelector('main').innerHTML = '<div class="empty">المنتج غير موجود.</div>'; return; }
    let desc = String(p.description || ('شراء ' + p.name + ' من المحسن ستور.')).replace(/\s+/g, ' ').trim();
    let seller = p.profiles?.store_name || p.profiles?.full_name || 'المحسن ستور';
    document.title = `${p.name} - المحسن ستور`;
    let setMeta = (name, content) => {
        let m = document.querySelector(`meta[name="${name}"]`);
        if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m) }
        m.content = content;
    };
    setMeta('description', desc.slice(0, 160));
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = new URL(`product.html?id=${encodeURIComponent(p.id)}`, location.href).href;
    let oldLd = document.getElementById('product-jsonld');
    if (oldLd) oldLd.remove();
    let ld = document.createElement('script');
    ld.id = 'product-jsonld'; ld.type = 'application/ld+json';

