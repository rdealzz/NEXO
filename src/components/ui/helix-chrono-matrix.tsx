'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FiberPoint {
    x: number;
    y: number;
    baseY: number;
    vy: number;
    excitation: number;
}

interface FiberRing {
    points: FiberPoint[];
    radius: number;
    baseRadius: number;
    yOffset: number;
    rotationSpeed: number;
    angle: number;
    harmonicOffset: number;
}

interface Particle {
    ringIndex: number;
    progress: number; // 0 to 1 along the ring
    speed: number;
    size: number;
}

export interface HelixChronoMatrixProps {
    headline?: string;
    className?: string;
}

type TopologyMode = 'DOUBLE_HELIX' | 'NEURAL_STRATA' | 'QUANTUM_RIBBONS';

export function HelixChronoMatrix({
    headline = "STRATA",
    className = "",
}: HelixChronoMatrixProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isRunning, setIsRunning] = useState(true);
    // Desenhar 28 anéis por quadro é o trabalho mais caro do app. Ele só se
    // justifica enquanto a malha está na tela e a aba está à frente — rolar a
    // página para baixo ou trocar de aba não pode continuar custando quadros.
    const [visivel, setVisivel] = useState(true);
    const [topology, setTopology] = useState<TopologyMode>('DOUBLE_HELIX');

    // O tema vem do app (o atributo data-tema no <html>), não do sistema
    // operacional: quem escolheu claro vê a malha clara mesmo com o celular no
    // escuro. O observer pega a troca no alternador, sem recarregar a página.
    useEffect(() => {
        const raiz = document.documentElement;
        const ler = () => setIsDarkMode(raiz.dataset.tema === 'escuro');
        ler();
        const observer = new MutationObserver(ler);
        observer.observe(raiz, { attributes: true, attributeFilter: ['data-tema'] });
        return () => observer.disconnect();
    }, []);

    // Smooth pointer ref
    const pointerRef = useRef({
        x: -2000,
        y: -2000,
        targetX: -2000,
        targetY: -2000,
        radius: 220,
    });

    const ringsRef = useRef<FiberRing[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const topologyTransitionRef = useRef({ progress: 1, from: 'DOUBLE_HELIX' as TopologyMode, to: 'DOUBLE_HELIX' as TopologyMode });

    // Initialize stratified 3D ribbon fibers and traveling particles
    const initTopology = useCallback((width: number, height: number) => {
        const rings: FiberRing[] = [];
        const ringCount = 28;
        const pointsPerRing = 120;

        for (let r = 0; r < ringCount; r++) {
            const progress = r / ringCount;
            const points: FiberPoint[] = [];
            const baseRadius = Math.min(width, height) * 0.35 * (0.4 + progress * 0.6);
            const yOffset = (progress - 0.5) * (height * 0.45);

            for (let p = 0; p < pointsPerRing; p++) {
                points.push({
                    x: 0,
                    y: 0,
                    baseY: yOffset,
                    vy: 0,
                    excitation: 0,
                });
            }

            rings.push({
                points,
                radius: baseRadius,
                baseRadius,
                yOffset,
                rotationSpeed: (r % 2 === 0 ? 1 : -1) * (0.002 + (r / ringCount) * 0.0025),
                angle: (r * Math.PI) / ringCount,
                harmonicOffset: r * 0.2,
            });
        }

        ringsRef.current = rings;

        // Initialize moving particles along the lines
        const particles: Particle[] = [];
        const particleCount = 45;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                ringIndex: Math.floor(Math.random() * ringCount),
                progress: Math.random(),
                speed: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
                size: Math.random() * 1.5 + 1.5,
            });
        }
        particlesRef.current = particles;
    }, []);

    // Canvas Resize Observer
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.contentRect;
                const dpr = Math.min(window.devicePixelRatio || 1, 2);

                dimensionsRef.current = { width: rect.width, height: rect.height };
                canvas.width = Math.floor(rect.width * dpr);
                canvas.height = Math.floor(rect.height * dpr);
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
                initTopology(rect.width, rect.height);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [initTopology]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Duas condições, guardadas fora do React porque quem as muda são dois
        // eventos independentes: estar na tela e a aba estar à frente.
        let naTela = true;
        const recalcular = () => setVisivel(naTela && !document.hidden);

        const observer = new IntersectionObserver(
            ([entrada]) => {
                naTela = entrada.isIntersecting;
                recalcular();
            },
            // Um fio de folga: volta a rodar pouco antes de reaparecer, para a
            // malha nunca ser vista parada.
            { rootMargin: '80px' },
        );
        observer.observe(container);
        document.addEventListener('visibilitychange', recalcular);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', recalcular);
        };
    }, []);

    // Handle topology transition
    const handleTopologyChange = (newMode: TopologyMode) => {
        if (newMode === topology) return;
        topologyTransitionRef.current = {
            progress: 0,
            from: topology,
            to: newMode,
        };
        setTopology(newMode);
    };

    // Main Render & Smooth Physics Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!visivel) return;

        let animId = 0;
        let time = 0;

        const render = () => {
            if (!isRunning) {
                animId = requestAnimationFrame(render);
                return;
            }

            time += 0.012;
            const { width, height } = dimensionsRef.current;
            const pointer = pointerRef.current;
            const rings = ringsRef.current;
            const particles = particlesRef.current;
            const trans = topologyTransitionRef.current;

            if (trans.progress < 1) {
                trans.progress = Math.min(1, trans.progress + 0.05);
            }

            // Silky smooth mouse interpolation (Lerp)
            pointer.x += (pointer.targetX - pointer.x) * 0.1;
            pointer.y += (pointer.targetY - pointer.y) * 0.1;

            const isDark = isDarkMode;
            const strokeBase = isDark ? '255, 255, 255' : '17, 17, 17';

            // Sem fundo próprio: o canvas é limpo de verdade — por isso o
            // contexto é criado com alpha (com `alpha: false` o canvas é opaco e
            // clearRect pinta preto, que era o bloco escuro do topo da página) —
            // e o branco, ou o preto, da página aparece atrás dos fios.
            ctx.clearRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;

            // Render fibers
            for (let rIdx = 0; rIdx < rings.length; rIdx++) {
                const ring = rings[rIdx];
                ring.angle += ring.rotationSpeed;

                const points = ring.points;
                const numPoints = points.length;

                ctx.beginPath();
                let firstProjX = 0;
                let firstProjY = 0;
                let avgExcitation = 0;

                for (let pIdx = 0; pIdx < numPoints; pIdx++) {
                    const pt = points[pIdx];
                    const theta = (pIdx / numPoints) * Math.PI * 2 + ring.angle;

                    const getPos = (mode: TopologyMode) => {
                        let x = Math.cos(theta) * ring.radius;
                        let z = Math.sin(theta) * ring.radius;
                        let y = ring.yOffset;

                        if (mode === 'DOUBLE_HELIX') {
                            y += Math.sin(theta * 2 + time * 2 + ring.harmonicOffset) * 45;
                        } else if (mode === 'NEURAL_STRATA') {
                            x += Math.sin(y * 0.02 + time * 1.5) * 35;
                            y += Math.cos(theta * 3 + time) * 30;
                        } else {
                            x *= 1 + Math.sin(theta * 4 + time * 1.2) * 0.15;
                            y += Math.sin(x * 0.008 + time * 2) * 50;
                        }
                        return { x, y, z };
                    };

                    const posFrom = getPos(trans.from);
                    const posTo = getPos(trans.to);
                    const easeProgress = trans.progress < 0.5
                        ? 2 * trans.progress * trans.progress
                        : -1 + (4 - 2 * trans.progress) * trans.progress;

                    const x3D = posFrom.x + (posTo.x - posFrom.x) * easeProgress;
                    const y3D = posFrom.y + (posTo.y - posFrom.y) * easeProgress;
                    const z3D = posFrom.z + (posTo.z - posFrom.z) * easeProgress;

                    const fov = 600;
                    const cameraDist = 550;
                    const scale = fov / (cameraDist + z3D);

                    const projX = centerX + x3D * scale;
                    const projY = centerY + (y3D + pt.vy) * scale;

                    // Smooth pointer attraction field
                    const dx = projX - pointer.x;
                    const dy = projY - pointer.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < pointer.radius && dist > 0) {
                        const ratio = 1 - dist / pointer.radius;
                        const targetVy = Math.sin(theta + time) * ratio * 15;
                        pt.vy += (targetVy - pt.vy) * 0.1;
                        pt.excitation = Math.max(pt.excitation, ratio);
                    } else {
                        pt.vy *= 0.92;
                    }

                    pt.excitation *= 0.92;
                    avgExcitation += pt.excitation;

                    if (pIdx === 0) {
                        firstProjX = projX;
                        firstProjY = projY;
                        ctx.moveTo(projX, projY);
                    } else {
                        ctx.lineTo(projX, projY);
                    }
                }

                ctx.lineTo(firstProjX, firstProjY);

                avgExcitation /= numPoints;
                const depthAlpha = 0.15 + (rIdx / rings.length) * 0.45;
                const isExcited = avgExcitation > 0.05;

                if (isExcited) {
                    ctx.strokeStyle = isDark
                        ? `rgba(255, 255, 255, ${Math.min(1, 0.4 + avgExcitation * 0.6)})`
                        : `rgba(0, 0, 0, ${Math.min(1, 0.4 + avgExcitation * 0.6)})`;
                    ctx.lineWidth = 1.2 + avgExcitation * 1.5;
                } else {
                    ctx.strokeStyle = `rgba(${strokeBase}, ${depthAlpha * 0.6})`;
                    ctx.lineWidth = 0.75;
                }

                ctx.stroke();
            }

            // Render Traveling Points along the Lines (Black normally, White when hovered/excited)
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.progress = (p.progress + p.speed + 1) % 1;

                const ring = rings[p.ringIndex];
                if (!ring) continue;

                const numPoints = ring.points.length;
                const exactIndex = p.progress * numPoints;
                const pIdx1 = Math.floor(exactIndex) % numPoints;
                const pIdx2 = (pIdx1 + 1) % numPoints;
                const blend = exactIndex - Math.floor(exactIndex);

                const theta1 = (pIdx1 / numPoints) * Math.PI * 2 + ring.angle;
                const theta2 = (pIdx2 / numPoints) * Math.PI * 2 + ring.angle;

                // Simple interpolation for particle positioning
                const x1 = Math.cos(theta1) * ring.radius;
                const z1 = Math.sin(theta1) * ring.radius;
                const x2 = Math.cos(theta2) * ring.radius;
                const z2 = Math.sin(theta2) * ring.radius;

                const x3D = x1 + (x2 - x1) * blend;
                const z3D = z1 + (z2 - z1) * blend;
                const y3D = ring.yOffset;

                const fov = 600;
                const cameraDist = 550;
                const scale = fov / (cameraDist + z3D);

                const projX = centerX + x3D * scale;
                const projY = centerY + y3D * scale;

                // Check proximity to pointer for hover color inversion (Black -> White)
                const dx = projX - pointer.x;
                const dy = projY - pointer.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isNearHover = dist < pointer.radius;

                ctx.beginPath();
                ctx.arc(projX, projY, p.size * scale, 0, Math.PI * 2);

                if (isNearHover) {
                    // Inverted to white (or high contrast) when hovered
                    ctx.fillStyle = isDark ? '#ffffff' : '#000000';
                } else {
                    // Standard color opposite to lines (Black by default)
                    ctx.fillStyle = isDark ? '#000000' : '#ffffff';
                }
                ctx.fill();

                // Optional soft border outline for high definition clarity
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
                ctx.stroke();
            }

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [isRunning, topology, isDarkMode, visivel]);

    const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        pointerRef.current.targetX = e.clientX - rect.left;
        pointerRef.current.targetY = e.clientY - rect.top;
    };

    const handlePointerLeave = () => {
        pointerRef.current.targetX = -2000;
        pointerRef.current.targetY = -2000;
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            className={cn(
                "group relative flex h-full w-full select-none flex-col justify-between overflow-hidden bg-transparent",
                className
            )}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 block h-full w-full cursor-crosshair"
            />

            <div className="relative z-20 flex h-full w-full flex-col justify-between p-6 md:p-10">
                {/* Top Header Deck */}
                <header className="flex w-full flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                        {/* Topology Selector */}
                        <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white/80 p-1 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 shadow-sm">
                            {(['DOUBLE_HELIX', 'NEURAL_STRATA', 'QUANTUM_RIBBONS'] as TopologyMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleTopologyChange(mode)}
                                    className={cn(
                                        "rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wider transition-all duration-300",
                                        topology === mode
                                            ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-black"
                                            : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                                    )}
                                >
                                    {mode.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsRunning((prev) => !prev)}
                            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white/80 px-3 py-1.5 backdrop-blur-md transition-all hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:bg-neutral-800 shadow-sm"
                        >
                            {isRunning ? <Pause className="size-3" /> : <Play className="size-3" />}
                            <span className="font-mono text-[10px]">{isRunning ? "FREEZE" : "RUN"}</span>
                        </button>
                    </div>
                </header>

                {/* Center Stencil Typography */}
                <main className="pointer-events-none flex flex-col items-center justify-center text-center">
                    <h1 className="font-mono text-6xl font-black tracking-tighter uppercase sm:text-7xl md:text-9xl text-neutral-900/90 dark:text-white/90">
                        {headline}
                    </h1>
                </main>

                <div />
            </div>
        </div>
    );
}

export default HelixChronoMatrix;
