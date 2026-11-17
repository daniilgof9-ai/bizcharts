const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor('#0d1117'); tg.setBackgroundColor('#0d1117');
}

// --- ПОЛЬЗОВАТЕЛЬ ---
let userData = { name: "Пользователь", username: "@username", isPremium: false };

// Загружаем сохраненный статус премиума из памяти
const savedPremium = localStorage.getItem('bizcharts_isPremium');
if (savedPremium === 'true') userData.isPremium = true;

if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const u = tg.initDataUnsafe.user;
    userData.name = u.first_name || "Пользователь";
    userData.username = u.username ? `@${u.username}` : "@username";
}

// Применяем визуальные настройки (корзина, тариф и т.д.) при загрузке
function applyUISettings() {
    const trashBtn = document.getElementById('trash-btn');
    const tariffEl = document.getElementById('profile-tariff');
    const descEl = document.getElementById('limit-desc');
    const toggleBtn = document.getElementById('dev-toggle-btn');

    if (userData.isPremium) {
        if(trashBtn) trashBtn.style.display = 'block';
        if(tariffEl) { tariffEl.innerText = "Премиум"; tariffEl.style.color = "#2EC4B6"; }
        if(descEl) descEl.innerText = "Неограниченное количество отчетов.";
        if(toggleBtn) { toggleBtn.innerText = "⚙️ Переключить на Базовый"; toggleBtn.style.color = "#2EC4B6"; toggleBtn.style.borderColor = "#2EC4B6"; }
    } else {
        if(trashBtn) trashBtn.style.display = 'none';
        if(tariffEl) { tariffEl.innerText = "Базовый"; tariffEl.style.color = "#ff8c00"; }
        if(descEl) descEl.innerText = "Бесплатный тариф: 1 слот. Удаление = ожидание 7 дней.";
        if(toggleBtn) { toggleBtn.innerText = "⚙️ Переключить на Премиум"; toggleBtn.style.color = "#8b949e"; toggleBtn.style.borderColor = "#8b949e"; }
    }
}

// Функция переключения тарифа
function toggleDevPremium() {
    triggerHaptic('medium');
    userData.isPremium = !userData.isPremium;
    localStorage.setItem('bizcharts_isPremium', userData.isPremium);
    
    applyUISettings();
    renderHistory(); 
    updateProfile();
    
    showToast(userData.isPremium ? "Тариф изменен на Премиум" : "Тариф изменен на Базовый", "success");
}

function triggerHaptic(type = 'light') {
    if (tg && tg.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else tg.HapticFeedback.impactOccurred(type);
    }
}

function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'} ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let currentChart = null;
let currentData = null; 
let history = JSON.parse(localStorage.getItem('bizcharts_history')) || [];
let trash = JSON.parse(localStorage.getItem('bizcharts_trash')) || [];
let deletedAt = Number(localStorage.getItem('bizcharts_deletedAt')) || 0;
let chartTypes = ['doughnut', 'bar', 'line', 'comparison'];
let currentChartIndex = 0;

// --- ПРОВЕРКА ЛИМИТОВ ---
function canCreateReport() {
    if (userData.isPremium) return true; // В премиуме безлимит
    
    if (history.length >= 1) return false; 
    if (deletedAt > 0) {
        const diffDays = (Date.now() - deletedAt) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) return false;
    }
    return true;
}

function switchTab(tabId, btnElement = null) {
    triggerHaptic('light');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${tabId}`);
    if (target) target.classList.add('active');

    if (btnElement) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(b => {
            if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    if (tabId === 'home' || tabId === 'history') renderHistory();
    if (tabId === 'trash') renderTrash();
    if (tabId === 'profile') updateProfile();
}

// --- ПЕРЕИМЕНОВАНИЕ ---
function promptRename() {
    if (!currentData) return;
    let newName = prompt("Введите название для отчета:", currentData.name || "Анализ");
    if (newName && newName.trim() !== "") {
        currentData.name = newName.trim();
        const index = history.findIndex(item => item.id === currentData.id);
        if (index !== -1) {
            history[index] = currentData;
            localStorage.setItem('bizcharts_history', JSON.stringify(history));
        }
        document.getElementById('result-title').innerText = currentData.name;
        showToast("Название обновлено", "success");
    }
}

function generateReport() {
    if (!canCreateReport()) {
        document.getElementById('limit-modal').classList.remove('hidden');
        triggerHaptic('error');
        return;
    }

    triggerHaptic('medium');
    const income = Number(document.getElementById('income').value) || 0;
    const purchase = Number(document.getElementById('purchase').value) || 0;
    const ads = Number(document.getElementById('ads').value) || 0;
    const salary = Number(document.getElementById('salary').value) || 0;
    const other = Number(document.getElementById('other').value) || 0;

    if (income === 0 && purchase === 0 && ads === 0 && salary === 0 && other === 0) {
        showToast("Введите хотя бы одну цифру", "error");
        return;
    }

    const totalExpenses = purchase + ads + salary + other;
    const profit = income - totalExpenses;

    currentData = {
        id: Date.now(), date: new Date().toLocaleDateString('ru-RU'),
        name: "Отчет от " + new Date().toLocaleDateString('ru-RU'),
        income, purchase, ads, salary, other, totalExpenses, profit,
        isSaved: false
    };

    if (!history.find(item => item.id === currentData.id)) {
        history.unshift(currentData);
        localStorage.setItem('bizcharts_history', JSON.stringify(history));
    }

    switchTab('result');
    document.getElementById('result-title').innerText = currentData.name;
    document.getElementById('res-profit').innerText = `${profit.toLocaleString('ru-RU')} ₽`;
    document.getElementById('res-expenses').innerText = `${totalExpenses.toLocaleString('ru-RU')} ₽`;

    let advice = "";
    if (profit < 0) advice = "Вы работаете в минус! Срочно проверьте расходы.";
    else if (ads > totalExpenses * 0.4) advice = "Реклама съедает почти половину расходов. Проверьте окупаемость.";
    else advice = "Отличные показатели! Продолжайте в том же духе.";
    document.getElementById('res-advice').innerText = advice;

    document.getElementById('save-btn').innerText = "💾 Сохранить в избранное";
    drawChart(chartTypes[currentChartIndex]);
}

function drawChart(type) {
    if (!currentData) return;
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (currentChart) currentChart.destroy();

    const d = currentData;
    const isComparison = type === 'comparison';
    let chartType = type;
    if (isComparison) chartType = 'bar';

    let labels = ['Закупка', 'Реклама', 'Зарплата', 'Прочее'];
    let datasets = [{
        label: 'Расходы', data: [d.purchase, d.ads, d.salary, d.other],
        backgroundColor: ['#2EC4B6', '#ff8c00', '#B0B0B0', '#E63946'],
        borderColor: '#161b22', borderWidth: 2, borderRadius: 6
    }];

    if (isComparison) {
        labels = ['Доход', 'Расход', 'Прибыль'];
        datasets = [{
            label: 'Сумма', data: [d.income, d.totalExpenses, d.profit],
            backgroundColor: ['#2EC4B6', '#E63946', '#ff8c00'], borderRadius: 6
        }];
    } else if (type === 'line') {
        let sortedHistory = [...history].sort((a, b) => a.id - b.id);
        if (sortedHistory.length < 2) {
            labels = ['Нет данных', 'Мало данных'];
            datasets = [{
                label: 'Нужно 2 отчета', data: [0, 0],
                borderColor: '#30363d', borderWidth: 3, borderDash: [5, 5], tension: 0.4, fill: false, pointBackgroundColor: '#8b949e'
            }];
        } else {
            labels = sortedHistory.map(item => item.date.slice(0, 5)); 
            datasets = [{
                label: 'Динамика', data: sortedHistory.map(item => item.profit),
                borderColor: '#ff8c00', backgroundColor: 'rgba(255, 140, 0, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#fff'
            }];
        }
    }

    currentChart = new Chart(ctx, {
        type: chartType,
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: type === 'doughnut' || isComparison || type === 'line', labels: { color: '#8b949e', font: { family: 'Inter', size: 12 } } } 
            },
            scales: type !== 'doughnut' ? {
                x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: '#30363d', drawBorder: false } },
                y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: '#30363d', drawBorder: false } }
            } : {}
        }
    });
}

function changeChartType(type, btn) {
    triggerHaptic('light');
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    currentChartIndex = chartTypes.indexOf(type);
    drawChart(type);
}

function saveToHistory() {
    triggerHaptic('medium');
    if (!currentData) return;
    
    currentData.isSaved = true;
    const index = history.findIndex(item => item.id === currentData.id);
    if (index !== -1) {
        history[index] = currentData;
        localStorage.setItem('bizcharts_history', JSON.stringify(history));
        showToast("Добавлено в избранное", "success");
        triggerHaptic('success');
        document.getElementById('save-btn').innerText = "⭐ В избранном";
    }
}

// --- УДАЛЕНИЕ ---
let itemToDeleteId = null;

function handleDelete(id, event) {
    event.stopPropagation();
    
    if (userData.isPremium) {
        // В Премиум просто кидаем в корзину
        const itemIndex = history.findIndex(item => item.id === id);
        if (itemIndex !== -1) {
            const item = history.splice(itemIndex, 1)[0];
            trash.push(item);
            localStorage.setItem('bizcharts_history', JSON.stringify(history));
            localStorage.setItem('bizcharts_trash', JSON.stringify(trash));
            showToast("Перемещено в корзину", "default");
            renderHistory();
        }
    } else {
        // В Базовом показываем страшное окно
        itemToDeleteId = id;
        document.getElementById('delete-warning-modal').classList.remove('hidden');
    }
}

function confirmDeleteBasic() {
    if (itemToDeleteId) {
        history = history.filter(item => item.id !== itemToDeleteId);
        localStorage.setItem('bizcharts_history', JSON.stringify(history));
        
        // Штраф 7 дней
        deletedAt = Date.now();
        localStorage.setItem('bizcharts_deletedAt', deletedAt);
        
        itemToDeleteId = null;
        closeModal('delete-warning-modal');
        showToast("Отчет удален навсегда", "error");
        triggerHaptic('error');
        renderHistory();
    }
}

// --- КОРЗИНА (Только Премиум) ---
function restoreFromTrash(id, event) {
    event.stopPropagation();
    const itemIndex = trash.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        const item = trash.splice(itemIndex, 1)[0];
        history.push(item);
        localStorage.setItem('bizcharts_history', JSON.stringify(history));
        localStorage.setItem('bizcharts_trash', JSON.stringify(trash));
        showToast("Восстановлено", "success");
        renderTrash();
    }
}

function deleteForever(id, event) {
    event.stopPropagation();
    trash = trash.filter(item => item.id !== id);
    localStorage.setItem('bizcharts_trash', JSON.stringify(trash));
    showToast("Удалено навсегда", "error");
    renderTrash();
}

function renderHistory() {
    const homeList = document.getElementById('home-history');
    const fullList = document.getElementById('full-history');
    const timerEl = document.getElementById('update-timer');
    
    if(document.getElementById('history-count')) document.getElementById('history-count').innerText = history.length;
    if(document.getElementById('trash-count')) document.getElementById('trash-count').innerText = trash.length;
    if(homeList) homeList.innerHTML = ''; 
    if(fullList) fullList.innerHTML = '';

    // Таймер
    if (timerEl) {
        if (!userData.isPremium && history.length > 0) {
            timerEl.innerText = `Лимит: 1 отчет`;
            timerEl.style.color = "#8b949e";
            timerEl.style.display = "block";
        } else if (!userData.isPremium && deletedAt > 0) {
            const diffDays = 7 - Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                timerEl.innerText = `Новый через ${diffDays} дн.`;
                timerEl.style.color = "#E63946";
            } else {
                timerEl.innerText = `Можно создать!`;
                timerEl.style.color = "#2EC4B6";
            }
            timerEl.style.display = "block";
        } else {
            timerEl.style.display = "none";
        }
    }

    if (history.length === 0) {
        if(homeList) homeList.innerHTML = '<div class="empty-state" style="color:#8b949e;text-align:center;padding:20px;">Нет отчетов</div>';
        if(fullList) fullList.innerHTML = '<div class="empty-state" style="color:#8b949e;text-align:center;padding:20px;">История пуста</div>';
        return;
    }

    history.forEach((item, index) => {
        const isSavedIcon = item.isSaved ? '⭐ ' : '';
        const card = `
            <div class="history-card" onclick="loadFromHistory(${index})" style="position: relative;">
                <div class="history-info" style="max-width: 65%;">
                    <h4>${isSavedIcon}${item.name}</h4>
                    <p>Доход: ${item.income.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div class="history-amount">${item.profit > 0 ? '+' : ''}${item.profit.toLocaleString('ru-RU')} ₽</div>
                <button onclick="handleDelete(${item.id}, event)" style="background:none; border:none; color:#E63946; font-size: 18px; cursor:pointer; margin-left: 5px;">🗑️</button>
            </div>
        `;
        if (index < 3 && homeList) homeList.innerHTML += card;
        if (fullList) fullList.innerHTML += card;
    });

    let total = history.length;
    let sumProfit = history.reduce((acc, curr) => acc + curr.profit, 0);
    let avg = total > 0 ? Math.round(sumProfit / total) : 0;
    
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-avg')) document.getElementById('stat-avg').innerText = `${avg.toLocaleString('ru-RU')} ₽`;
}

function renderTrash() {
    const trashList = document.getElementById('trash-list');
    if (!trashList) return;
    trashList.innerHTML = '';

    // Очистка старых (старше 30 дней)
    const now = Date.now();
    trash = trash.filter(item => {
        const daysInTrash = (now - item.id) / (1000 * 60 * 60 * 24);
        return daysInTrash <= 30;
    });
    localStorage.setItem('bizcharts_trash', JSON.stringify(trash));

    if (trash.length === 0) {
        trashList.innerHTML = '<div class="empty-state" style="color:#8b949e;text-align:center;padding:20px;">Корзина пуста</div>';
        return;
    }

    trash.forEach((item) => {
        const card = `
            <div class="history-card" style="position: relative; opacity: 0.8;">
                <div class="history-info" style="max-width: 60%;">
                    <h4>${item.name}</h4>
                    <p>${item.date}</p>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button onclick="restoreFromTrash(${item.id}, event)" style="background:none; border:none; color:#2EC4B6; font-size: 18px; cursor:pointer;">♻️</button>
                    <button onclick="deleteForever(${item.id}, event)" style="background:none; border:none; color:#E63946; font-size: 18px; cursor:pointer;">❌</button>
                </div>
            </div>
        `;
        trashList.innerHTML += card;
    });
}

function loadFromHistory(index) {
    triggerHaptic('light');
    currentData = history[index];
    document.getElementById('income').value = currentData.income;
    document.getElementById('purchase').value = currentData.purchase;
    document.getElementById('ads').value = currentData.ads;
    document.getElementById('salary').value = currentData.salary;
    document.getElementById('other').value = currentData.other;

    switchTab('result');
    document.getElementById('result-title').innerText = currentData.name;
    document.getElementById('res-profit').innerText = `${currentData.profit.toLocaleString('ru-RU')} ₽`;
    document.getElementById('res-expenses').innerText = `${currentData.totalExpenses.toLocaleString('ru-RU')} ₽`;
    document.getElementById('save-btn').innerText = currentData.isSaved ? "⭐ В избранном" : "💾 Сохранить в избранное";
    
    drawChart(chartTypes[currentChartIndex]);
}

function updateProfile() {
    if (document.getElementById('profile-name')) document.getElementById('profile-name').innerText = userData.name;
    if (document.getElementById('profile-username')) document.getElementById('profile-username').innerText = userData.username;
    
    let used = history.length > 0 ? (userData.isPremium ? history.length : 1) : 0;
    let limitText = userData.isPremium ? "∞" : "1";
    if(document.getElementById('limit-text')) document.getElementById('limit-text').innerText = `${used} / ${limitText}`;
    
    let percent = userData.isPremium ? 100 : (used * 100);
    const progressBar = document.getElementById('limit-progress');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.style.background = (percent >= 100 && !userData.isPremium) ? '#E63946' : '#2EC4B6';
    }
}

function buyPremium() {
    triggerHaptic('medium');
    if (tg) {
        tg.sendData(JSON.stringify({ action: "buy_premium" }));
        tg.close();
    } else {
        showToast("Тест: Оплата 49 Stars", "default");
    }
}

function closeModal(modalId) {
    triggerHaptic('light');
    document.getElementById(modalId).classList.add('hidden');
}

// --- ФОН С ЧАСТИЦАМИ ---
const canvas = document.getElementById('particleCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; });

    const particles = [];
    class Particle {
        constructor() {
            this.x = Math.random() * width; this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 1.5 + 0.5; this.alpha = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
            this.alpha += (Math.random() - 0.5) * 0.02;
            this.alpha = Math.max(0.05, Math.min(0.6, this.alpha));
        }
        draw() {
            ctx.beginPath(); 
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 140, 0, ${this.alpha})`;
            ctx.shadowBlur = 10; 
            ctx.shadowColor = '#ff8c00';
            ctx.fill(); 
            ctx.shadowBlur = 0;
        }
    }
    for (let i = 0; i < 40; i++) particles.push(new Particle());
    function animateParticles() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

window.addEventListener('load', () => {
    applyUISettings(); // Применяем настройки тарифа
    renderHistory();
    if(document.getElementById('screen-profile').classList.contains('active')) {
        updateProfile();
    }
});