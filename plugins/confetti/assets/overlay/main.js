import { ConfettiParticle } from './confetti.js';

// 获取画布和上下文
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');

// 粒子池
let particles = [];

/**
 * 调整画布尺寸
 */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * 根据屏幕大小计算发射参数
 * 屏幕越大，粒子越多、速度越快，确保均匀覆盖
 */
function getScreenConfig() {
  const w = canvas.width;
  const h = canvas.height;
  // 以1920x1080为基准，按面积比例缩放粒子数量
  const areaRatio = (w * h) / (1920 * 1080);
  // 以对角线长度为基准缩放速度
  const diagonal = Math.sqrt(w * w + h * h);
  const diagRatio = diagonal / Math.sqrt(1920 * 1920 + 1080 * 1080);

  return {
    // 每次burst的粒子数，根据屏幕面积缩放
    burstCount: Math.round(18 * Math.max(0.6, areaRatio)),
    // 速度根据对角线缩放，确保彩带能飞到屏幕对角
    minSpeed: Math.round(25 * diagRatio),
    maxSpeed: Math.round(55 * diagRatio),
    // 屏幕面积比，用于决定爆发次数
    areaRatio,
    diagRatio,
  };
}

/**
 * 从指定位置和角度范围发射一批粒子
 */
function emitBurst(x, y, angleMin, angleMax, config) {
  const count = config.burstCount + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const angle = angleMin + Math.random() * (angleMax - angleMin);
    const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
    const particle = new ConfettiParticle(
      x + (Math.random() - 0.5) * 40,
      y + (Math.random() - 0.5) * 20,
      angle,
      speed,
      canvas.width,
      canvas.height
    );
    particles.push(particle);
  }
}

/**
 * 从左下角发射 — 角度覆盖从近乎水平到近乎垂直，均匀散布
 */
function emitFromLeft(config) {
  const x = 0;
  const y = canvas.height;
  // 角度范围：从 -85度 到 -5度（几乎覆盖整个右上方半空间）
  emitBurst(x, y, -Math.PI * 0.47, -Math.PI * 0.03, config);
}

/**
 * 从右下角发射 — 角度覆盖从近乎水平到近乎垂直，均匀散布
 */
function emitFromRight(config) {
  const x = canvas.width;
  const y = canvas.height;
  // 角度范围：从 -175度 到 -95度（几乎覆盖整个左上方半空间）
  emitBurst(x, y, -Math.PI * 0.97, -Math.PI * 0.53, config);
}

/**
 * 动画主循环
 */
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 更新和绘制所有粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    if (p.alive) {
      p.draw(ctx);
    } else {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
}

/**
 * 一次性瞬间喷发
 * 只用2波，间隔极短(15ms)，营造瞬间爆发感
 */
function instantBurst() {
  const config = getScreenConfig();
  // 根据屏幕大小决定每波爆发次数，确保大屏也能铺满
  const burstsPerWave = Math.max(4, Math.round(6 * config.areaRatio));

  // 第一波 — 主力爆发（立即执行）
  for (let i = 0; i < burstsPerWave; i++) {
    emitFromLeft(config);
    emitFromRight(config);
  }

  // 第二波 — 补充爆发（15ms后，几乎同时）
  setTimeout(() => {
    for (let i = 0; i < Math.ceil(burstsPerWave * 0.6); i++) {
      emitFromLeft(config);
      emitFromRight(config);
    }
  }, 15);
}

/**
 * 初始化
 */
function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 瞬间喷发
  instantBurst();

  // 启动动画
  animate();
}

// 启动
init();
