const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor('#0d1117'); tg.setBackgroundColor('#0d1117');
}

// --- ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ---
let userData = { name: "Пользователь", username: "@user" };
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const u = tg.initDataUnsafe.user;
    userData.name = u.first_name || "Пользователь";
    userData.username = u.username ? `@${u.username}` : "";
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
let chartTypes = ['doughnut', 'bar', 'horizontalBar', 'line', 'comparison'];
let currentChartIndex = 0;

function switchTab(tabId, btnElement = null) {
    triggerHaptic('light');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${tabId}`).classList.add('active');

    if (btnElement) {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(b => {
            if (b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    if (tabId === 'home' || tabId === 'history') renderHistory();
    if (tabId === 'profile') updateProfile();
}

function updateHint(inputId, hintId) {
    const val = Number(document.getElementById(inputId).value) || 0;
    const income = Number(document.getElementById('income').value) || 0;
    const hintEl = document.getElementById(hintId);
    
    if (inputId !== 'income' && income > 0 && val > 0) {
        const percent = ((val / income) * 100).toFixed(1);
        hintEl.innerText = `Это ${percent}% от вашего дохода`;
        hintEl.classList.add('show');
    } else {
        hintEl.classList.remove('show');
    }
}

function generateReport() {
    triggerHaptic('medium');
    const income = Number(document.getElementById('income').value) || 0;
    const purchase = Number(document.getElementById('purchase').value) || 0;
    const ads = Number(document.getElementById('ads').value) || 0;
    const salary = Number(document.getElementById('salary').value) || 0;
    const other = Number(document.getElementById('other').value) || 0;

    if (income === 0 && purchase === 0 && ads === 0 && salary === 0 && other === 0) {
        showToast("Введите хотя бы одну цифру", "error");
        triggerHaptic('error');
        return;
    }

    const totalExpenses = purchase + ads + salary + other;
    const profit = income - totalExpenses;

    currentData = {
        id: Date.now(), date: new Date().toLocaleDateString('ru-RU'),
        income, purchase, ads, salary, other, totalExpenses, profit
    };

    switchTab('result');
    document.getElementById('summary-skeleton').classList.remove('hidden');
    document.getElementById('summary-real').classList.add('hidden');
    document.getElementById('chart-loader').classList.remove('hidden');
    document.getElementById('mainChart').style.opacity = '0';

    setTimeout(() => {
        document.getElementById('summary-skeleton').classList.add('hidden');
        document.getElementById('summary-real').classList.remove('hidden');
        document.getElementById('chart-loader').classList.add('hidden');
        document.getElementById('mainChart').style.opacity = '1';

        document.getElementById('res-profit').innerText = `${profit.toLocaleString('ru-RU')} ₽`;
        document.getElementById('res-expenses').innerText = `${totalExpenses.toLocaleString('ru-RU')} ₽`;

        let advice = "";
        if (profit < 0) advice = "Вы работаете в минус! Срочно проверьте расходы.";
        else if (ads > totalExpenses * 0.4) advice = "Реклама съедает почти половину расходов. Проверьте окупаемость.";
        else advice = "Отличные показатели! Продолжайте в том же духе.";
        document.getElementById('res-advice').innerText = advice;

        drawChart(chartTypes[currentChartIndex]);
    }, 600);
}

function drawChart(type) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (currentChart) currentChart.destroy();

    const d = currentData;
    const isComparison = type === 'comparison';
    let chartType = type;
    if (isComparison) chartType = 'bar';
    if (type === 'horizontalBar') chartType = 'bar';

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
        // График динамики (линия)
        labels = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май'];
        datasets = [{
            label: 'Динамика прибыли', 
            data: [d.profit * 0.5, d.profit * 0.8, d.profit * 0.6, d.profit * 0.9, d.profit],
            borderColor: '#ff8c00', backgroundColor: 'rgba(255, 140, 0, 0.1)',
            borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#fff'
        }];
    }

    currentChart = new Chart(ctx, {
        type: chartType,
        data: { labels, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            indexAxis: type === 'horizontalBar' ? 'y' : 'x',
            plugins: { 
                legend: { display: type === 'doughnut' || isComparison, labels: { color: '#8b949e', font: { family: 'Inter', size: 12 } } } 
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
    btn.classList.add('active');
    currentChartIndex = chartTypes.indexOf(type);
    drawChart(type);
}

let touchStartX = 0;
document.getElementById('swipe-zone').addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
document.getElementById('swipe-zone').addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) {
        currentChartIndex = (currentChartIndex + 1) % chartTypes.length;
        updateChartBySwipe();
    }
    if (touchEndX > touchStartX + 50) {
        currentChartIndex = (currentChartIndex - 1 + chartTypes.length) % chartTypes.length;
        updateChartBySwipe();
    }
}, {passive: true});

function updateChartBySwipe() {
    triggerHaptic('light');
    document.querySelectorAll('.chart-tab').forEach((b, i) => {
        if (i === currentChartIndex) b.classList.add('active');
        else b.classList.remove('active');
    });
    drawChart(chartTypes[currentChartIndex]);
}

function saveToHistory() {
    triggerHaptic('medium');
    if (!currentData) return;
    if (history.length >= 1) {
        document.getElementById('limit-modal').classList.remove('hidden');
        triggerHaptic('error');
        return;
    }
    if (!history.find(item => item.id === currentData.id)) {
        history.unshift(currentData);
        localStorage.setItem('bizcharts_history', JSON.stringify(history));
        showToast("Отчет сохранен", "success");
        triggerHaptic('success');
    }
    switchTab('home');
}

function renderHistory() {
    const homeList = document.getElementById('home-history');
    const fullList = document.getElementById('full-history');
    const timerEl = document.getElementById('update-timer');
    
    document.getElementById('history-count').innerText = history.length;
    
    homeList.innerHTML = ''; 
    fullList.innerHTML = '';

    // --- ЛОГИКА СЧЕТЧИКА ДНЕЙ ---
    if (history.length > 0) {
        // Берем дату самого свежего отчета (он первый в массиве, так как мы делаем unshift)
        // Но для надежности лучше найти максимальный ID (самый новый)
        const latestReport = history.reduce((prev, current) => (prev.id > current.id) ? prev : current);
        
        // Переводим ID (timestamp) в дату
        const lastDate = new Date(latestReport.id);
        
        // Прибавляем 30 дней
        const nextUpdateDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Считаем разницу в днях между "сегодня" и датой обновления
        const today = new Date();
        const diffTime = nextUpdateDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            // Функция для правильного склонения (1 день, 2 дня, 5 дней)
            let dayWord = "дней";
            if (diffDays % 10 === 1 && diffDays % 100 !== 11) dayWord = "день";
            else if ([2, 3, 4].includes(diffDays % 10) && ![12, 13, 14].includes(diffDays % 100)) dayWord = "дня";
            
            timerEl.innerText = `Обновить через ${diffDays} ${dayWord}`;
            timerEl.style.color = "#8b949e"; // Серый цвет, пока время есть
        } else {
            timerEl.innerText = `Пора обновить данные!`;
            timerEl.style.color = "#E63946"; // Красный цвет
            timerEl.style.animation = "pulse 2s infinite"; // Легкая пульсация
        }
        timerEl.style.display = "block";
    } else {
        timerEl.style.display = "none";
    }

    // --- ОТРИСОВКА СПИСКА ---
    if (history.length === 0) {
        homeList.innerHTML = '<div class="empty-state" style="color:#8b949e;text-align:center;padding:20px;">Нет сохраненных отчетов</div>';
        fullList.innerHTML = '<div class="empty-state" style="color:#8b949e;text-align:center;padding:20px;">История пуста</div>';
        return;
    }

    history.forEach((item, index) => {
        const card = `
            <div class="history-card" onclick="loadFromHistory(${index})">
                <div class="history-info">
                    <h4>Отчет от ${item.date}</h4>
                    <p>Доход: ${item.income.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div class="history-amount">${item.profit > 0 ? '+' : ''}${item.profit.toLocaleString('ru-RU')} ₽</div>
            </div>
        `;
        if (index < 3) homeList.innerHTML += card;
        fullList.innerHTML += card;
    });

    let total = history.length;
    let sumProfit = history.reduce((acc, curr) => acc + curr.profit, 0);
    let avg = total > 0 ? Math.round(sumProfit / total) : 0;
    
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-avg').innerText = `${avg.toLocaleString('ru-RU')} ₽`;
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
    document.getElementById('res-profit').innerText = `${currentData.profit.toLocaleString('ru-RU')} ₽`;
    document.getElementById('res-expenses').innerText = `${currentData.totalExpenses.toLocaleString('ru-RU')} ₽`;
    drawChart(chartTypes[currentChartIndex]);
}

function updateProfile() {
    // Установка имени и юзернейма
    document.getElementById('profile-name').innerText = userData.name;
    document.getElementById('profile-username').innerText = userData.username;
    
    let limit = 1;
    let used = history.length > limit ? limit : history.length;
    document.getElementById('limit-text').innerText = `${used} / ${limit}`;
    let percent = (used / limit) * 100;
    document.getElementById('limit-progress').style.width = `${percent}%`;
    if (percent >= 100) {
        document.getElementById('limit-progress').style.background = '#E63946';
    } else {
        document.getElementById('limit-progress').style.background = '#2EC4B6';
    }
}

function buyPremium() {
    triggerHaptic('medium');
    if (tg) {
        // Закрываем приложение и отправляем сигнал боту
        tg.sendData(JSON.stringify({ action: "buy_premium" }));
        tg.close();
    } else {
        showToast("Тест: Оплата 49 Stars", "default");
    }
}

function closeModal() {
    triggerHaptic('light');
    document.getElementById('limit-modal').classList.add('hidden');
}

// --- ФОН С ЧАСТИЦАМИ ---
const canvas = document.getElementById('particleCanvas');
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
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 140, 0, ${this.alpha})`;
        ctx.shadowBlur = 10; ctx.shadowColor = '#ff8c00';
        ctx.fill(); ctx.shadowBlur = 0;
    }
}
for (let i = 0; i < 40; i++) particles.push(new Particle());
function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
}
animateParticles();

window.addEventListener('load', () => {
    renderHistory();
});