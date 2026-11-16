const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor('#0d1117'); tg.setBackgroundColor('#0d1117');
}

function triggerHaptic() {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

// Анимация цифр (Банкомат)
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        obj.innerHTML = Math.floor(easeOut * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = end;
    };
    window.requestAnimationFrame(step);
}

// Запуск анимаций на главном экране
window.addEventListener('load', () => {
    setTimeout(() => {
        animateValue(document.getElementById('priceMain'), 0, 49, 1200);
        setTimeout(() => { document.getElementById('priceMain').innerHTML += ' ⭐️'; }, 1300);
        animateValue(document.getElementById('stat1'), 0, 15, 1000);
        animateValue(document.getElementById('stat2'), 0, 5, 1200);
        animateValue(document.getElementById('stat3'), 0, 3, 800);
    }, 300);
});

// --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ ---
const mainScreen = document.getElementById('mainScreen');
const formScreen = document.getElementById('formScreen');
const resultScreen = document.getElementById('resultScreen');
let myChart = null; // Переменная для хранения графика

// Кнопка "Построить диаграмму" на главном экране
document.getElementById('startBtn').addEventListener('click', () => {
    triggerHaptic();
    mainScreen.classList.add('hidden');
    formScreen.classList.remove('hidden');
});

// Кнопка "Назад" на экране формы
document.getElementById('backBtn').addEventListener('click', () => {
    triggerHaptic();
    formScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
});

// Кнопка "Показать график"
document.getElementById('generateBtn').addEventListener('click', () => {
    triggerHaptic();

    // Получаем значения (если пусто, то 0)
    const income = Number(document.getElementById('income').value) || 0;
    const purchase = Number(document.getElementById('purchase').value) || 0;
    const ads = Number(document.getElementById('ads').value) || 0;
    const salary = Number(document.getElementById('salary').value) || 0;
    const other = Number(document.getElementById('other').value) || 0;

    if (income === 0 && purchase === 0 && ads === 0 && salary === 0 && other === 0) {
        if(tg) tg.showAlert("Пожалуйста, введите хотя бы одну цифру!");
        return;
    }

    // Переключаем экран
    formScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    // Считаем общие расходы
    const totalExpenses = purchase + ads + salary + other;
    const profit = income - totalExpenses;

    // Текст с рекомендацией
    let advice = `Доход: ${income.toLocaleString('ru-RU')} ₽\n`;
    advice += `Расходы: ${totalExpenses.toLocaleString('ru-RU')} ₽\n`;
    advice += `Прибыль: ${profit.toLocaleString('ru-RU')} ₽\n\n`;

    if (profit < 0) {
        advice += "⚠️ Вы работаете в минус! Срочно проверьте расходы.";
    } else if (ads > totalExpenses * 0.4) {
        advice += "⚠️ Реклама съедает почти половину расходов. Проверьте окупаемость.";
    } else {
        advice += "✅ Отличные показатели! Продолжайте в том же духе.";
    }
    document.getElementById('adviceText').innerText = advice;

    // Рисуем график через Chart.js
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Если старый график есть, удаляем его
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut', // Круговая диаграмма с вырезом
        data: {
            labels: ['Закупка', 'Реклама', 'Зарплаты', 'Прочее'],
            datasets: [{
                data: [purchase, ads, salary, other],
                backgroundColor: [
                    '#2EC4B6', // Бирюзовый
                    '#ff8c00', // Оранжевый
                    '#B0B0B0', // Серый
                    '#E63946'  // Красный
                ],
                borderColor: '#1c2128',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#ffffff', font: { family: 'Inter', size: 12 } }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
});

// Кнопка "Построить ещё"
document.getElementById('restartBtn').addEventListener('click', () => {
    triggerHaptic();
    resultScreen.classList.add('hidden');
    formScreen.classList.remove('hidden');
    // Очищаем поля
    document.querySelectorAll('input').forEach(input => input.value = '');
});

// --- ФОН С ЧАСТИЦАМИ (Без изменений) ---
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