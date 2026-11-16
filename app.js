const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0d1117');
    tg.setBackgroundColor('#0d1117');
}

function triggerHaptic() {
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Банкоматная анимация цифр
function animateValue(obj, start, end, duration, isPrice = false) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOut * (end - start) + start);
        
        if (isPrice) {
            obj.innerHTML = current.toLocaleString('ru-RU') + ' ₽';
        } else {
            obj.innerHTML = current;
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            if (isPrice) obj.innerHTML = end.toLocaleString('ru-RU') + ' ₽';
            else obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        animateValue(document.getElementById('priceMain'), 0, 49, 1200, false);
        
        // Принудительно добавляем звезду после завершения анимации
        setTimeout(() => {
            document.getElementById('priceMain').innerHTML += ' ⭐️';
        }, 1300);

        animateValue(document.getElementById('stat1'), 0, 15, 1000);
        animateValue(document.getElementById('stat2'), 0, 5, 1200);
        animateValue(document.getElementById('stat3'), 0, 3, 800);
    }, 300);
});

document.getElementById('actionBtn').addEventListener('click', () => {
    triggerHaptic();
    if (tg) {
        tg.sendData(JSON.stringify({ action: "build_chart" }));
    } else {
        alert("Тест: Вы нажали Построить диаграмму");
    }
});

// Фон с летающими оранжевыми частицами
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
});

const particles = [];
const particleCount = 40;

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
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

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}

animateParticles();
