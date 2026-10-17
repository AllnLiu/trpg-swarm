/**
 * @fileoverview 100vw x 100vh Full-Viewport Tactical Canvas 2D VTT Renderer.
 * Handles Retina HiDPI scaling, mouse pan & wheel zoom, terrain layers (stone, swamp,
 * half cover +2 AC, three-quarters cover +5 AC, high ground, lava/eldritch hazard),
 * character tokens with vector class emblems, HP/SAN bars, AC badges, breathing aura,
 * and dynamic VFX particles (movement path, sword slash arc, fireball explosion + AoE preview,
 * heal sparkles, floating damage text, screen shake).
 */

export type TerrainType =
  | 'normal'
  | 'difficult_swamp'
  | 'cover_half'
  | 'cover_three_quarters'
  | 'high_ground'
  | 'hazard_lava';

export type TokenClassIcon = 'paladin' | 'rogue' | 'wizard' | 'cleric' | 'monster';

export interface GridCellTerrain {
  x: number;
  y: number;
  type: TerrainType;
  label?: string;
}

export interface VttToken {
  id: string;
  name: string;
  role: string;
  icon: TokenClassIcon;
  isEnemy: boolean;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
  ac: number;
  color: string;
  isActive?: boolean;
}

export interface FloatingTextVfx {
  id: string;
  gridX: number;
  gridY: number;
  text: string;
  color: string;
  createdAt: number;
  durationMs: number;
}

export interface ParticleVfx {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface SlashArcVfx {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  createdAt: number;
  durationMs: number;
}

export interface MovePathVfx {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  createdAt: number;
  durationMs: number;
}

export interface AoePreviewCircle {
  gridX: number;
  gridY: number;
  radiusCells: number;
  color: string;
  createdAt: number;
  durationMs: number;
}

export class VttRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridCols: number = 16;
  private gridRows: number = 11;
  private cellSize: number = 64;

  // Camera Pan & Zoom
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1.0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  // Hover & Selection
  private hoveredCell: { x: number; y: number } | null = null;
  private onTokenClickCallback: ((token: VttToken) => void) | null = null;
  private onCellClickCallback: ((x: number, y: number) => void) | null = null;

  // State
  private terrains: Map<string, GridCellTerrain> = new Map();
  private tokens: VttToken[] = [];
  private activeTokenId: string | null = null;

  // VFX Queues
  private floatingTexts: FloatingTextVfx[] = [];
  private particles: ParticleVfx[] = [];
  private slashArcs: SlashArcVfx[] = [];
  private movePaths: MovePathVfx[] = [];
  private aoeCircles: AoePreviewCircle[] = [];
  private shakeIntensity: number = 0;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to initialize 2D context on VTT Canvas.');
    }
    this.ctx = context;

    this.handleResize();
    this.centerCamera();
    this.bindEvents();
    this.startRenderLoop();
  }

  private cellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Automatically handles window.devicePixelRatio Retina HiDPI scaling and viewport resize.
   */
  public handleResize(): void {
    if (typeof window === 'undefined') return;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public centerCamera(): void {
    if (typeof window === 'undefined') return;
    const boardWidth = this.gridCols * this.cellSize * this.zoom;
    const boardHeight = this.gridRows * this.cellSize * this.zoom;
    this.cameraX = Math.floor((window.innerWidth - boardWidth) / 2);
    this.cameraY = Math.floor((window.innerHeight - boardHeight) / 2) + 12;
  }

  private bindEvents(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.dragStartX = e.clientX - this.cameraX;
        this.dragStartY = e.clientY - this.cameraY;
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging) {
        this.cameraX = e.clientX - this.dragStartX;
        this.cameraY = e.clientY - this.dragStartY;
      }
      const cell = this.screenToGrid(e.clientX, e.clientY);
      if (
        cell.x >= 0 &&
        cell.x < this.gridCols &&
        cell.y >= 0 &&
        cell.y < this.gridRows
      ) {
        this.hoveredCell = cell;
      } else {
        this.hoveredCell = null;
      }
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (this.isDragging) {
        const movedDist = Math.hypot(
          e.clientX - this.dragStartX - this.cameraX,
          e.clientY - this.dragStartY - this.cameraY
        );
        this.isDragging = false;
        if (movedDist < 5) {
          this.handleCanvasClick(e.clientX, e.clientY);
        }
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const nextZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.55), 2.2);

        // Zoom toward cursor
        const wx = (e.clientX - this.cameraX) / this.zoom;
        const wy = (e.clientY - this.cameraY) / this.zoom;

        this.zoom = nextZoom;
        this.cameraX = e.clientX - wx * this.zoom;
        this.cameraY = e.clientY - wy * this.zoom;
      },
      { passive: false }
    );
  }

  private handleCanvasClick(clientX: number, clientY: number): void {
    const cell = this.screenToGrid(clientX, clientY);
    if (cell.x < 0 || cell.x >= this.gridCols || cell.y < 0 || cell.y >= this.gridRows) {
      return;
    }
    const clickedToken = this.tokens.find((t) => t.gridX === cell.x && t.gridY === cell.y);
    if (clickedToken && this.onTokenClickCallback) {
      this.onTokenClickCallback(clickedToken);
    } else if (this.onCellClickCallback) {
      this.onCellClickCallback(cell.x, cell.y);
    }
  }

  public screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = (screenX - this.cameraX) / this.zoom;
    const worldY = (screenY - this.cameraY) / this.zoom;
    return {
      x: Math.floor(worldX / this.cellSize),
      y: Math.floor(worldY / this.cellSize),
    };
  }

  public setOnTokenClick(cb: (token: VttToken) => void): void {
    this.onTokenClickCallback = cb;
  }

  public setOnCellClick(cb: (x: number, y: number) => void): void {
    this.onCellClickCallback = cb;
  }

  public setTerrains(terrainList: GridCellTerrain[]): void {
    this.terrains.clear();
    for (const t of terrainList) {
      this.terrains.set(this.cellKey(t.x, t.y), t);
    }
  }

  public setTokens(tokens: VttToken[], activeTokenId: string | null = null): void {
    this.tokens = tokens;
    this.activeTokenId = activeTokenId;
  }

  // ==================== VFX Trigger Methods ====================

  public triggerScreenShake(intensity: number = 10): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public addFloatingText(gridX: number, gridY: number, text: string, color: string = '#fbbf24'): void {
    this.floatingTexts.push({
      id: `${Date.now()}-${Math.random()}`,
      gridX,
      gridY,
      text,
      color,
      createdAt: performance.now(),
      durationMs: 1450,
    });
  }

  public addMovePath(fromX: number, fromY: number, toX: number, toY: number, color: string = '#38bdf8'): void {
    this.movePaths.push({
      fromX,
      fromY,
      toX,
      toY,
      color,
      createdAt: performance.now(),
      durationMs: 1100,
    });
  }

  public addSwordSlashVfx(fromX: number, fromY: number, toX: number, toY: number): void {
    this.slashArcs.push({
      fromX,
      fromY,
      toX,
      toY,
      color: '#f8fafc',
      createdAt: performance.now(),
      durationMs: 420,
    });

    // Add metallic sparks at target
    const cx = (toX + 0.5) * this.cellSize;
    const cy = (toY + 0.5) * this.cellSize;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2.5,
        color: i % 2 === 0 ? '#fde047' : '#f97316',
        alpha: 1,
        decay: 0.032,
      });
    }
  }

  public addFireballVfx(gridX: number, gridY: number, radiusCells: number = 2): void {
    this.aoeCircles.push({
      gridX,
      gridY,
      radiusCells,
      color: '#ef4444',
      createdAt: performance.now(),
      durationMs: 950,
    });

    const cx = (gridX + 0.5) * this.cellSize;
    const cy = (gridY + 0.5) * this.cellSize;
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 6.5;
      const palette = ['#ef4444', '#f97316', '#facc15', '#fef08a'];
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 5,
        color: palette[i % palette.length],
        alpha: 1,
        decay: 0.022 + Math.random() * 0.015,
      });
    }
    this.triggerScreenShake(14);
  }

  public addHealVfx(gridX: number, gridY: number): void {
    const cx = (gridX + 0.5) * this.cellSize;
    const cy = (gridY + 0.5) * this.cellSize;
    for (let i = 0; i < 26; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 42,
        y: cy + (Math.random() - 0.5) * 32,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.2 - Math.random() * 2.2,
        radius: 2.5 + Math.random() * 3,
        color: i % 2 === 0 ? '#4ade80' : '#a7f3d0',
        alpha: 1,
        decay: 0.02,
      });
    }
  }

  // ==================== Core Render Loop ====================

  private startRenderLoop(): void {
    const loop = (now: number) => {
      this.renderFrame(now);
      if (typeof window !== 'undefined') {
        this.animationFrameId = window.requestAnimationFrame(loop);
      }
    };
    if (typeof window !== 'undefined') {
      this.animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  public destroy(): void {
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  public renderFrame(now: number): void {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const height = typeof window !== 'undefined' ? window.innerHeight : 720;
    const ctx = this.ctx;

    // 1. Clear full viewport background
    ctx.save();
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, width, height);

    // Subtle radial ambient glow behind tabletop
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      80,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.7
    );
    bgGrad.addColorStop(0, '#131c31');
    bgGrad.addColorStop(1, '#060911');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Apply Screen Shake + Camera Transform
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.2) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    } else {
      this.shakeIntensity = 0;
    }

    ctx.translate(this.cameraX + shakeX, this.cameraY + shakeY);
    ctx.scale(this.zoom, this.zoom);

    // 3. Draw Board Outer Frame & Stone Tiles
    this.drawBoardAndTerrains(ctx, now);

    // 4. Draw Movement Paths & AoE Previews
    this.drawMovePathsAndAoe(ctx, now);

    // 5. Draw Character & Monster Tokens
    this.drawTokens(ctx, now);

    // 6. Draw Slash Arcs, Particles & Floating Texts
    this.drawVfxLayer(ctx, now);

    ctx.restore();
  }

  private drawBoardAndTerrains(ctx: CanvasRenderingContext2D, now: number): void {
    const totalW = this.gridCols * this.cellSize;
    const totalH = this.gridRows * this.cellSize;

    // Board drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 36;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6, -6, totalW + 12, totalH + 12);
    ctx.restore();

    // Draw individual cells
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;
        const terrain = this.terrains.get(this.cellKey(x, y));
        const type: TerrainType = terrain ? terrain.type : 'normal';

        // Base stone checkerboard
        ctx.fillStyle = (x + y) % 2 === 0 ? '#162032' : '#131b2c';
        ctx.fillRect(px, py, this.cellSize, this.cellSize);

        // Terrain overlays
        if (type === 'difficult_swamp') {
          ctx.fillStyle = 'rgba(20, 83, 45, 0.58)';
          ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
          ctx.fillStyle = '#4ade80';
          ctx.font = '10px sans-serif';
          ctx.fillText('沼澤 2x', px + 6, py + 15);
        } else if (type === 'cover_half') {
          ctx.fillStyle = 'rgba(51, 65, 85, 0.85)';
          ctx.fillRect(px + 6, py + 6, this.cellSize - 12, this.cellSize - 12);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 6, py + 6, this.cellSize - 12, this.cellSize - 12);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('石柱 +2AC', px + 7, py + 36);
        } else if (type === 'cover_three_quarters') {
          ctx.fillStyle = 'rgba(30, 58, 138, 0.72)';
          ctx.fillRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, this.cellSize - 8, this.cellSize - 8);
          ctx.fillStyle = '#93c5fd';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText('祭壇 +5AC', px + 7, py + 36);
        } else if (type === 'high_ground') {
          ctx.fillStyle = 'rgba(120, 53, 15, 0.52)';
          ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 3, py + 3, this.cellSize - 6, this.cellSize - 6);
          ctx.fillStyle = '#fcd34d';
          ctx.font = '10px sans-serif';
          ctx.fillText('高地 ▲', px + 10, py + 16);
        } else if (type === 'hazard_lava') {
          const pulse = 0.45 + 0.2 * Math.sin(now * 0.005 + x + y);
          ctx.fillStyle = `rgba(185, 28, 28, ${pulse})`;
          ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
          ctx.fillStyle = '#fca5a5';
          ctx.font = '10px sans-serif';
          ctx.fillText('邪陣/熔岩', px + 8, py + 16);
        }

        // Grid line border
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, this.cellSize, this.cellSize);

        // Coordinate subtle label on edges
        if (y === 0 || x === 0) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
          ctx.font = '9px monospace';
          ctx.fillText(`${x},${y}`, px + 3, py + this.cellSize - 4);
        }
      }
    }

    // Hover highlight
    if (this.hoveredCell) {
      const hx = this.hoveredCell.x * this.cellSize;
      const hy = this.hoveredCell.y * this.cellSize;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 1, hy + 1, this.cellSize - 2, this.cellSize - 2);
    }
  }

  private drawMovePathsAndAoe(ctx: CanvasRenderingContext2D, now: number): void {
    // Move dashed lines
    this.movePaths = this.movePaths.filter((m) => now - m.createdAt < m.durationMs);
    for (const path of this.movePaths) {
      const alpha = 1 - (now - path.createdAt) / path.durationMs;
      const sx = (path.fromX + 0.5) * this.cellSize;
      const sy = (path.fromY + 0.5) * this.cellSize;
      const ex = (path.toX + 0.5) * this.cellSize;
      const ey = (path.toY + 0.5) * this.cellSize;

      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    }

    // AoE preview circles
    this.aoeCircles = this.aoeCircles.filter((c) => now - c.createdAt < c.durationMs);
    for (const circle of this.aoeCircles) {
      const progress = (now - circle.createdAt) / circle.durationMs;
      const alpha = 1 - progress;
      const cx = (circle.gridX + 0.5) * this.cellSize;
      const cy = (circle.gridY + 0.5) * this.cellSize;
      const radiusPx = circle.radiusCells * this.cellSize;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha * 0.45);
      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTokens(ctx: CanvasRenderingContext2D, now: number): void {
    for (const token of this.tokens) {
      const cx = (token.gridX + 0.5) * this.cellSize;
      const cy = (token.gridY + 0.5) * this.cellSize;
      const radius = this.cellSize * 0.36;
      const isActive = token.id === this.activeTokenId || token.isActive;

      ctx.save();
      if (token.hp <= 0) {
        ctx.globalAlpha = 0.38;
      }

      // 1. Active Actor Golden Breathing Aura
      if (isActive && token.hp > 0) {
        const pulseRadius = radius + 5 + Math.sin(now * 0.007) * 3.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Token Base Circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = token.isEnemy ? '#fca5a5' : '#e2e8f0';
      ctx.stroke();

      // 3. Vector Class Emblem inside Token
      this.drawClassVectorIcon(ctx, token.icon, cx, cy, radius * 0.55);

      // 4. HP Bar & SAN Bar above Token
      const barW = this.cellSize * 0.78;
      const barH = 5;
      const barX = cx - barW / 2;
      const hpBarY = cy - radius - 14;
      const sanBarY = cy - radius - 7;

      // HP Bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX, hpBarY, barW, barH);
      const hpRatio = Math.max(0, Math.min(1, token.hp / Math.max(1, token.maxHp)));
      ctx.fillStyle = token.isEnemy ? '#ef4444' : '#22c55e';
      ctx.fillRect(barX, hpBarY, barW * hpRatio, barH);

      // SAN Bar (for investigators / party)
      if (token.maxSan > 0) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(barX, sanBarY, barW, 4);
        const sanRatio = Math.max(0, Math.min(1, token.san / Math.max(1, token.maxSan)));
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(barX, sanBarY, barW * sanRatio, 4);
      }

      // 5. AC Shield Badge (bottom-right of token)
      const acX = cx + radius * 0.72;
      const acY = cy + radius * 0.68;
      ctx.beginPath();
      ctx.arc(acX, acY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${token.ac}`, acX, acY);

      // 6. Token Nameplate (bottom)
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(token.name, cx, cy + radius + 11);

      ctx.restore();
    }
  }

  private drawClassVectorIcon(
    ctx: CanvasRenderingContext2D,
    icon: TokenClassIcon,
    cx: number,
    cy: number,
    size: number
  ): void {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (icon === 'paladin') {
      // Shield + Vertical Sword
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.6, cy - size * 0.5);
      ctx.lineTo(cx + size * 0.6, cy - size * 0.5);
      ctx.lineTo(cx + size * 0.5, cy + size * 0.2);
      ctx.lineTo(cx, cy + size * 0.75);
      ctx.lineTo(cx - size * 0.5, cy + size * 0.2);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.8);
      ctx.lineTo(cx, cy + size * 0.55);
      ctx.stroke();
    } else if (icon === 'rogue') {
      // Twin Crossed Daggers
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.65, cy - size * 0.65);
      ctx.lineTo(cx + size * 0.65, cy + size * 0.65);
      ctx.moveTo(cx + size * 0.65, cy - size * 0.65);
      ctx.lineTo(cx - size * 0.65, cy + size * 0.65);
      ctx.stroke();
    } else if (icon === 'wizard') {
      // 6-Pointed Arcane Star
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * size * 0.75, cy + Math.sin(angle) * size * 0.75);
        ctx.lineTo(
          cx - Math.cos(angle) * size * 0.75,
          cy - Math.sin(angle) * size * 0.75
        );
        ctx.stroke();
      }
    } else if (icon === 'cleric') {
      // Radiant Sunburst Cross
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.75);
      ctx.lineTo(cx, cy + size * 0.75);
      ctx.moveTo(cx - size * 0.65, cy - size * 0.1);
      ctx.lineTo(cx + size * 0.65, cy - size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.1, size * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Monster Skull / Eldritch Tentacle Crown
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.1, size * 0.52, Math.PI, 0, false);
      ctx.lineTo(cx + size * 0.35, cy + size * 0.55);
      ctx.lineTo(cx - size * 0.35, cy + size * 0.55);
      ctx.closePath();
      ctx.stroke();
      // Eyes
      ctx.beginPath();
      ctx.arc(cx - size * 0.2, cy - size * 0.05, 2, 0, Math.PI * 2);
      ctx.arc(cx + size * 0.2, cy - size * 0.05, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawVfxLayer(ctx: CanvasRenderingContext2D, now: number): void {
    // 1. Sword Slash Arcs
    this.slashArcs = this.slashArcs.filter((s) => now - s.createdAt < s.durationMs);
    for (const slash of this.slashArcs) {
      const progress = (now - slash.createdAt) / slash.durationMs;
      const cx = (slash.toX + 0.5) * this.cellSize;
      const cy = (slash.toY + 0.5) * this.cellSize;
      const angle = Math.atan2(slash.toY - slash.fromY, slash.toX - slash.fromX);

      ctx.save();
      ctx.strokeStyle = slash.color;
      ctx.globalAlpha = 1 - progress;
      ctx.lineWidth = 4 * (1 - progress * 0.5);
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, this.cellSize * 0.48, angle - 1.1, angle + 1.1);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Floating Damage / Heal / Crit Texts
    this.floatingTexts = this.floatingTexts.filter((ft) => now - ft.createdAt < ft.durationMs);
    for (const ft of this.floatingTexts) {
      const progress = (now - ft.createdAt) / ft.durationMs;
      const cx = (ft.gridX + 0.5) * this.cellSize;
      const cy = (ft.gridY + 0.2) * this.cellSize - progress * 34;

      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - Math.pow(progress, 2));
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, cx, cy);
      ctx.restore();
    }
  }
}
