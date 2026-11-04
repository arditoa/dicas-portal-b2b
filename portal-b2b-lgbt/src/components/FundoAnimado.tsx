'use client';

// Rodada 129 — fundo animado (constelação) das telas públicas do portal do
// parceiro: login, boas-vindas e cadastro. Pontos e linhas em movimento sobre
// um degradê escuro com a identidade do Dicas (rosa e roxo).
//
// Decisões:
//  - Canvas 2D puro, sem biblioteca: leve e sem dependência nova.
//  - Respeita "reduzir movimento" do sistema (desenha um quadro parado).
//  - Pausa quando a aba está escondida, pra não gastar bateria à toa.
//  - É só decoração: aria-hidden e pointer-events-none, nunca captura clique.
//  - O conteúdo da tela precisa ficar em `relative z-10` por cima dele.
import { useEffect, useRef } from 'react';

type Ponto = { x: number; y: number; vx: number; vy: number; r: number; cor: string };

// "r,g,b" — metade branco, o resto rosa e roxo da marca.
const CORES = ['255,255,255', '255,255,255', '255,255,255', '225,48,108', '168,85,247'];
const DISTANCIA_LINHA = 150;
const DISTANCIA_MOUSE = 170;

export default function FundoAnimado({ intensidade = 1 }: { intensidade?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let largura = 0;
    let altura = 0;
    let quadro = 0;
    let pontos: Ponto[] = [];
    const mouse = { x: -9999, y: -9999 };

    const montar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const quantidade = Math.min(100, Math.max(28, Math.round((largura * altura) / 15000)));
      pontos = Array.from({ length: quantidade }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() - 0.5) * 0.36 * intensidade,
        vy: (Math.random() - 0.5) * 0.36 * intensidade,
        r: Math.random() * 1.6 + 0.8,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
      }));
    };

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);

      if (!reduzirMovimento) {
        for (const p of pontos) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > largura) p.vx *= -1;
          if (p.y < 0 || p.y > altura) p.vy *= -1;
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < pontos.length; i++) {
        const a = pontos[i];
        for (let j = i + 1; j < pontos.length; j++) {
          const b = pontos[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < DISTANCIA_LINHA) {
            ctx.strokeStyle = `rgba(${a.cor}, ${(1 - d / DISTANCIA_LINHA) * 0.32})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < DISTANCIA_MOUSE) {
          ctx.strokeStyle = `rgba(225,48,108, ${(1 - dm / DISTANCIA_MOUSE) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      for (const p of pontos) {
        ctx.fillStyle = `rgba(${p.cor}, 0.85)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const laco = () => {
      desenhar();
      quadro = requestAnimationFrame(laco);
    };

    const iniciar = () => {
      cancelAnimationFrame(quadro);
      montar();
      if (reduzirMovimento) desenhar();
      else quadro = requestAnimationFrame(laco);
    };

    const aoMoverMouse = (e: PointerEvent) => {
      const caixa = canvas.getBoundingClientRect();
      mouse.x = e.clientX - caixa.left;
      mouse.y = e.clientY - caixa.top;
    };
    const aoSairMouse = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const aoMudarVisibilidade = () => {
      if (document.hidden) cancelAnimationFrame(quadro);
      else if (!reduzirMovimento) quadro = requestAnimationFrame(laco);
    };
    let espera: ReturnType<typeof setTimeout> | undefined;
    const aoRedimensionar = () => {
      clearTimeout(espera);
      espera = setTimeout(iniciar, 150);
    };

    iniciar();
    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('pointermove', aoMoverMouse);
    window.addEventListener('pointerleave', aoSairMouse);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(espera);
      window.removeEventListener('resize', aoRedimensionar);
      window.removeEventListener('pointermove', aoMoverMouse);
      window.removeEventListener('pointerleave', aoSairMouse);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [intensidade]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 15% 10%, rgba(168,85,247,0.28), transparent 60%), radial-gradient(ellipse 70% 60% at 90% 95%, rgba(225,48,108,0.26), transparent 60%), linear-gradient(160deg, #15102A 0%, #0B0B0E 70%)',
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
