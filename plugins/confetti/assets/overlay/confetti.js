// 五彩纸带颜色集合 - 每条纸带有正反两面颜色
const COLORS = [
  { front: '#FF6B6B', back: '#CC4444' },
  { front: '#FFE66D', back: '#CCB830' },
  { front: '#4ECDC4', back: '#2E9E96' },
  { front: '#45B7D1', back: '#2D8FA6' },
  { front: '#96CEB4', back: '#6BA88A' },
  { front: '#DDA0DD', back: '#AA70AA' },
  { front: '#FF69B4', back: '#CC4488' },
  { front: '#00CED1', back: '#009A9E' },
  { front: '#FFA07A', back: '#CC7050' },
  { front: '#F7DC6F', back: '#C4A830' },
  { front: '#BB8FCE', back: '#8860A0' },
  { front: '#85C1E9', back: '#5090B8' },
  { front: '#82E0AA', back: '#50B078' },
  { front: '#FF5252', back: '#CC2020' },
  { front: '#FFAB40', back: '#CC8020' },
  { front: '#69F0AE', back: '#40C080' },
  { front: '#40C4FF', back: '#2090CC' },
  { front: '#E040FB', back: '#A020C0' },
  { front: '#B2FF59', back: '#80CC30' },
  { front: '#7C4DFF', back: '#5030CC' },
];

// 纸带形状类型 - 以真实纸带条为主，搭配少量纸片
const SHAPES = [
  'ribbon',     // 经典飘带
  'ribbon',     // 增加权重
  'ribbon',     // 增加权重
  'twistedRibbon', // 扭转飘带
  'twistedRibbon', // 增加权重
  'curlyRibbon',   // 卷曲飘带
  'curlyRibbon',   // 增加权重
  'waveRibbon',    // 波浪飘带
  'confettiPiece', // 方形纸片
  'confettiPiece', // 方形纸片
];

/**
 * 单个五彩纸带粒子
 */
export class ConfettiParticle {
  constructor(x, y, angle, speed, canvasWidth, canvasHeight) {
    this.x = x;
    this.y = y;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // 运动参数
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.28 + Math.random() * 0.18;
    this.friction = 0.982 + Math.random() * 0.012;
    this.windResistance = 0.006 + Math.random() * 0.012;

    // 外观参数 - 正反面双色
    const colorPair = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.frontColor = colorPair.front;
    this.backColor = colorPair.back;
    this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.size = 10 + Math.random() * 14;
    this.opacity = 1;

    // 纸带的随机弯曲程度（每条纸带独有）
    this.curvature = 0.3 + Math.random() * 1.0;
    // 纸带的宽高比随机化
    this.aspectRatio = 1.8 + Math.random() * 1.2;

    // 旋转参数
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.15;

    // 3D翻转效果 - 模拟纸带在空中翻转
    this.tiltAngle = Math.random() * Math.PI * 2;
    this.tiltSpeed = 0.04 + Math.random() * 0.08;
    // 第二轴翻转，让纸带有更真实的3D感
    this.flipAngle = Math.random() * Math.PI * 2;
    this.flipSpeed = 0.02 + Math.random() * 0.05;

    // 摇摆参数 - 模拟空气阻力
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = 0.03 + Math.random() * 0.05;
    this.wobbleAmplitude = 1.2 + Math.random() * 1.8;

    // 生命周期
    this.life = 1;
    this.decay = 0.001 + Math.random() * 0.002;

    this.alive = true;
  }

  update() {
    if (!this.alive) return;

    // 应用重力
    this.vy += this.gravity;

    // 应用摩擦力
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 风阻摇摆 - 速度越慢摇摆越明显
    this.wobble += this.wobbleSpeed;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const wobbleFactor = Math.max(0.3, 1 - speed / 30);
    this.vx += Math.sin(this.wobble) * this.wobbleAmplitude * this.windResistance * wobbleFactor;

    // 更新位置
    this.x += this.vx;
    this.y += this.vy;

    // 旋转 - 速度越慢旋转越快（纸带飘落时会翻转加速）
    this.rotation += this.rotationSpeed * (1 + wobbleFactor * 0.5);
    this.tiltAngle += this.tiltSpeed;
    this.flipAngle += this.flipSpeed;

    // 生命衰减
    this.life -= this.decay;
    this.opacity = Math.max(0, this.life);

    // 判断是否存活
    if (this.life <= 0 || this.y > this.canvasHeight + 50) {
      this.alive = false;
    }
  }

  draw(ctx) {
    if (!this.alive || this.opacity <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;

    // 3D翻转 - 根据翻转角度决定显示正面还是反面
    const tiltScale = Math.cos(this.tiltAngle);
    const flipScale = Math.cos(this.flipAngle);
    const showFront = tiltScale >= 0;

    ctx.scale(tiltScale, 1);

    // 根据正反面选择颜色
    const mainColor = showFront ? this.frontColor : this.backColor;
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = mainColor;

    switch (this.shape) {
      case 'ribbon':
        this.drawRibbon(ctx, flipScale);
        break;
      case 'twistedRibbon':
        this.drawTwistedRibbon(ctx, flipScale);
        break;
      case 'curlyRibbon':
        this.drawCurlyRibbon(ctx, flipScale);
        break;
      case 'waveRibbon':
        this.drawWaveRibbon(ctx, flipScale);
        break;
      case 'confettiPiece':
        this.drawConfettiPiece(ctx, flipScale);
        break;
    }

    ctx.restore();
  }

  // 经典飘带 - 自然弯曲的长条纸带
  drawRibbon(ctx, flipScale) {
    const w = this.size * 0.5;
    const h = this.size * this.aspectRatio;
    const curve = w * this.curvature;

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    // 右侧边 - 自然弯曲
    ctx.bezierCurveTo(
      curve, -h / 4,
      -curve * 0.6, h / 4,
      w * 0.3, h / 2
    );
    // 底部圆角
    ctx.lineTo(-w * 0.3, h / 2);
    // 左侧边 - 对称弯曲
    ctx.bezierCurveTo(
      -curve * 0.4, h / 4,
      curve * 0.8, -h / 4,
      0, -h / 2
    );
    ctx.closePath();
    ctx.fill();

    // 添加高光条纹，增加立体感
    this._drawHighlight(ctx, w, h, flipScale);
  }

  // 扭转飘带 - 中间有扭转的纸带
  drawTwistedRibbon(ctx, flipScale) {
    const w = this.size * 0.55;
    const h = this.size * this.aspectRatio;
    const twist = w * this.curvature * 0.8;

    // 上半段
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.bezierCurveTo(
      -w / 2 + twist, -h / 4,
      w / 2 - twist * 0.5, -h / 8,
      w * 0.1, 0
    );
    ctx.lineTo(-w * 0.1, 0);
    ctx.bezierCurveTo(
      -w / 2 + twist * 0.3, -h / 8,
      -w / 2 + twist * 0.6, -h / 4,
      w / 2, -h / 2
    );
    ctx.closePath();
    ctx.fill();

    // 下半段 - 用反面颜色表示扭转
    ctx.fillStyle = this.backColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, 0);
    ctx.bezierCurveTo(
      w / 2 - twist * 0.5, h / 8,
      -w / 2 + twist, h / 4,
      w / 2, h / 2
    );
    ctx.lineTo(-w / 2, h / 2);
    ctx.bezierCurveTo(
      -w / 2 + twist * 0.6, h / 4,
      w / 2 - twist * 0.3, h / 8,
      w * 0.1, 0
    );
    ctx.closePath();
    ctx.fill();
  }

  // 卷曲飘带 - 末端卷曲的纸带
  drawCurlyRibbon(ctx, flipScale) {
    const w = this.size * 0.45;
    const h = this.size * this.aspectRatio;
    const curl = this.curvature;

    // 主体直条部分
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.bezierCurveTo(
      w / 2 + w * curl * 0.2, 0,
      w / 2 - w * curl * 0.3, h * 0.3,
      0, h * 0.35
    );
    ctx.bezierCurveTo(
      -w / 2 + w * curl * 0.3, h * 0.3,
      -w / 2 - w * curl * 0.2, 0,
      -w / 2, -h / 2
    );
    ctx.closePath();
    ctx.fill();

    // 卷曲尾部 - 螺旋卷
    ctx.beginPath();
    const startY = h * 0.3;
    ctx.moveTo(w * 0.15, startY);
    ctx.bezierCurveTo(
      w * curl * 0.8, startY + h * 0.1,
      w * curl * 0.6, startY + h * 0.25,
      0, startY + h * 0.2
    );
    ctx.bezierCurveTo(
      -w * curl * 0.4, startY + h * 0.15,
      -w * curl * 0.3, startY + h * 0.3,
      w * 0.2, h / 2
    );
    ctx.lineTo(-w * 0.1, h / 2);
    ctx.bezierCurveTo(
      -w * curl * 0.5, startY + h * 0.25,
      -w * curl * 0.2, startY + h * 0.1,
      -w * 0.15, startY
    );
    ctx.closePath();
    ctx.fillStyle = this.backColor;
    ctx.fill();
  }

  // 波浪飘带 - 柔和S形波浪
  drawWaveRibbon(ctx, flipScale) {
    const w = this.size * 0.45;
    const h = this.size * this.aspectRatio;
    const wave = w * this.curvature * 0.6;

    ctx.beginPath();
    // 右侧边 - 平滑波浪
    ctx.moveTo(w / 2, -h / 2);
    ctx.bezierCurveTo(
      w / 2 + wave, -h / 4,
      w / 2 - wave, 0,
      w / 2 + wave * 0.5, h / 4
    );
    ctx.quadraticCurveTo(w / 2 - wave * 0.3, h * 0.4, w / 2, h / 2);

    // 底边
    ctx.lineTo(-w / 2, h / 2);

    // 左侧边 - 平滑波浪（略有偏移，让纸带有厚度感）
    ctx.quadraticCurveTo(-w / 2 - wave * 0.2, h * 0.4, -w / 2 + wave * 0.4, h / 4);
    ctx.bezierCurveTo(
      -w / 2 - wave * 0.8, 0,
      -w / 2 + wave * 0.8, -h / 4,
      -w / 2, -h / 2
    );
    ctx.closePath();
    ctx.fill();

    // 中间折痕线 - 增加真实感
    ctx.strokeStyle = this.backColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha *= 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(wave * 0.5, -h / 4, -wave * 0.3, h / 4, 0, h / 2);
    ctx.stroke();
  }

  // 方形纸片 - 带折角的纸片
  drawConfettiPiece(ctx, flipScale) {
    const w = this.size * 0.8;
    const h = this.size * 0.6;
    const fold = Math.abs(flipScale) * w * 0.15;

    // 主体
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2 - fold, -h / 2);
    ctx.lineTo(w / 2, -h / 2 + fold);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();

    // 折角三角形 - 用反面颜色
    if (fold > 1) {
      ctx.fillStyle = this.backColor;
      ctx.beginPath();
      ctx.moveTo(w / 2 - fold, -h / 2);
      ctx.lineTo(w / 2 - fold, -h / 2 + fold);
      ctx.lineTo(w / 2, -h / 2 + fold);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 绘制高光条纹（增加立体感）
  _drawHighlight(ctx, w, h, flipScale) {
    ctx.save();
    ctx.globalAlpha *= 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, -h / 2);
    ctx.lineTo(w * 0.05, -h / 2);
    ctx.bezierCurveTo(
      w * 0.1, -h / 4,
      -w * 0.05, h / 4,
      w * 0.05, h / 2
    );
    ctx.lineTo(-w * 0.1, h / 2);
    ctx.bezierCurveTo(
      -w * 0.15, h / 4,
      w * 0.05, -h / 4,
      -w * 0.1, -h / 2
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}