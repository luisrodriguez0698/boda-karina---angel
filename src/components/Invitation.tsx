"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initTextAnimations } from "@/lib/textAnimations";
import Fireworks, { type FireworksHandlers } from "@fireworks-js/react";
import Birds from "@/components/Birds";

gsap.registerPlugin(ScrollTrigger);

// Rutas base de assets (copia tu carpeta Assets dentro de public/ para que quede public/Assets/...)
const ASSETS = {
  textos: "/Assets/TEXTOS",
  recursos: "/Assets/RECURSOS",
  nombres: "/Assets/nombres",
  elementos: "/Assets/Componentes",
  fotos: "/Assets/Fotos"
} as const;

/** Genera la ruta de un asset (codifica el nombre por si tiene espacios). */
function asset(path: string, file: string) {
  return `${path}/${encodeURIComponent(file)}`;
}

const GOOGLE_MAPS_LINK = "https://maps.app.goo.gl/QiZ6GNFLGTiuuYDm8";
const APPLE_MAPS_LINK = "https://maps.apple/p/-YkAN-fI9CzBcj";
const GOOGLE_MAPS_LINK_2 = "https://maps.app.goo.gl/JsZbHxnG7uHcTZiw7";
const APPLE_MAPS_LINK_2 = "https://maps.apple/p/d5veWnI2DeTnTZ";
const ENLACE_ITEM_1 = "https://maps.app.goo.gl/WctqMYxj7E7Gpigj9"; // pega aquí la URL del primer botón
const ENLACE_ITEM_2 = "https://maps.app.goo.gl/AtVPSosPRKwvnwQx8"; // pega aquí la URL del segundo botón
const ENLACE_ITEM_3 = "https://mesaderegalos.liverpool.com.mx/milistaderegalos/60027363"; // pega aquí la URL del segundo botón

const GALERIA_FOTOS = ["F_1.JPG", "F_2.JPG", "F_3.JPG", "F_4.JPG", "F_5.JPG", "F_6.JPG", "F_7.JPG"];

// Opciones para fireworks-js: tonos rosas (#D15366 / #CC6B7F ≈ hue 345–355)
const FIREWORKS_OPTIONS = {
  hue: { min: 345, max: 355 },
  delay: { min: 60, max: 100 },
  rocketsPoint: { min: 60, max: 70 },
  opacity: 1,
  particles: 80,
  traceLength: 4,
  acceleration: 1,
  explosion: 10,
  autoresize: true,
  sound: { enabled: false },
  mouse: { click: false, move: false },
};

const STORAGE_KEY = "hesed_invitado";

/** Formato visual teléfono: "XXX XXX XXXX" (solo dígitos, máx 10). */
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

type InvitadoRSVP = {
  nombre: string;
  numero: string;
  pases: number;
  confirmado: boolean;
  pasesConfirmados: number;
};

function saveInvitadoToStorage(inv: InvitadoRSVP) {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inv));
    } catch {}
  }
}

export default function Invitation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);
  const fireworksRefHero = useRef<FireworksHandlers | null>(null);
  const fireworksRefGracias = useRef<FireworksHandlers | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [countdown, setCountdown] = useState({ days: "00", hours: "00", minutes: "00", seconds: "00" });

  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [invitadoData, setInvitadoData] = useState<InvitadoRSVP | null>(null);
  const [numeroInput, setNumeroInput] = useState("");
  const [numeroLoading, setNumeroLoading] = useState(false);
  const [numeroError, setNumeroError] = useState("");
  const [rsvpPasesElegidos, setRsvpPasesElegidos] = useState(1);
  const [rsvpConfirming, setRsvpConfirming] = useState(false);
  const [modalAsistireOpen, setModalAsistireOpen] = useState(false);
  const [modalNoAsistirOpen, setModalNoAsistirOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [galeriaIndex, setGaleriaIndex] = useState(0);

  useEffect(() => {
    const isOpen = modalAsistireOpen || modalNoAsistirOpen;
    if (!isOpen) return;

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      // Restaurar el scroll sin animación: el CSS global tiene scroll-behavior: smooth,
      // que haría que este ajuste se vea como un scroll animado en vez de instantáneo.
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    };
  }, [modalAsistireOpen, modalNoAsistirOpen]);

  useEffect(() => {
    try {
      const s = window.sessionStorage.getItem(STORAGE_KEY);
      if (s) {
        const data = JSON.parse(s) as InvitadoRSVP;
        setInvitadoData(data);
        setRsvpPasesElegidos(data.pasesConfirmados > 0 ? data.pasesConfirmados : Math.min(1, data.pases));
      }
    } catch {}
    setHasCheckedStorage(true);
  }, []);

  const buscarInvitado = async () => {
    const n = numeroInput.replace(/\D/g, "").trim();
    if (!n.length) {
      setNumeroError("Ingresa un número válido");
      return;
    }
    setNumeroError("");
    setNumeroLoading(true);
    try {
      const res = await fetch(`/api/invitados?numero=${encodeURIComponent(n)}`);
      const data = await res.json();
      if (!res.ok) {
        setNumeroError(data.error || "No encontrado");
        return;
      }
      const inv: InvitadoRSVP = {
        nombre: data.nombre,
        numero: data.numero,
        pases: data.pases,
        confirmado: data.confirmado,
        pasesConfirmados: data.pasesConfirmados,
      };
      setInvitadoData(inv);
      setRsvpPasesElegidos(inv.pasesConfirmados > 0 ? inv.pasesConfirmados : Math.min(1, inv.pases));
      saveInvitadoToStorage(inv);
    } catch {
      setNumeroError("Error de conexión");
    } finally {
      setNumeroLoading(false);
    }
  };

  const confirmarAsistencia = async (asistira: boolean) => {
    if (!invitadoData) return;
    setRsvpConfirming(true);
    try {
      const res = await fetch("/api/invitados/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: invitadoData.numero,
          asistira,
          pasesConfirmados: asistira ? rsvpPasesElegidos : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNumeroError(data.error || "Error al confirmar");
        return;
      }
      const updated: InvitadoRSVP = {
        ...invitadoData,
        confirmado: true,
        pasesConfirmados: asistira ? rsvpPasesElegidos : 0,
      };
      setInvitadoData(updated);
      saveInvitadoToStorage(updated);
    } catch {
      setNumeroError("Error de conexión");
    } finally {
      setRsvpConfirming(false);
    }
  };

  useEffect(() => {
    const target = new Date("2026-10-12T16:00:00");
    const update = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!invitadoData) return;
    const hero = sectionsRef.current[0];
    if (!hero) return;

    // gsap.context() scopes all tweens to `hero` and handles cleanup on return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // ① papel picado — cae como tela y luego ondea con viento
      const picado = hero.querySelector<HTMLElement>(".absolute.inset-0 > div");
      if (picado) {
        gsap.set(picado, { transformOrigin: "top center" });

        // caída inicial
        tl.fromTo(picado,
          { scaleY: 0, opacity: 0 },
          { scaleY: 1, opacity: 1, duration: 1.4, ease: "elastic.out(1, 0.5)" },
          0
        );

        // viento — skewX: el borde superior queda fijo, el fondo se balancea
        gsap.to(picado, {
          skewX: 5,
          duration: 2.8,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 1.3,
        });

        // ráfaga complementaria con duración distinta → movimiento no mecánico
        gsap.to(picado, {
          scaleX: 1.025,
          y: -6,
          duration: 3.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 1.9,
        });
      }

      // ② imagen base (BASE_INTRO) — sube desde abajo con fade
      const baseImg = hero.querySelector<HTMLElement>("[data-hero-castle] > img:first-child");
      if (baseImg)
        tl.fromTo(baseImg,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: "power3.out" },
          0
        );

      // ③ corazón — aparece con rebote y leve rotación
      const heart = hero.querySelector<HTMLElement>("[data-hero-castle] > img:nth-child(2)");
      if (heart)
        tl.fromTo(heart,
          { scale: 0, rotation: -20, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1, duration: 0.65, ease: "back.out(2.5)" },
          0.4
        );

      // ④ bloques de texto — cascada stagger de arriba a abajo
      const textBlocks = hero.querySelectorAll<HTMLElement>("[data-hero-castle] > div > div");
      if (textBlocks.length)
        tl.fromTo(textBlocks,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.14, ease: "power2.out" },
          0.5
        );
    }, hero);

    return () => ctx.revert();
  }, [invitadoData]);

  // Cloth unfurl + wind loop — scroll-triggered, for all [data-picado-wind] elements
  useEffect(() => {
    if (!invitadoData || !containerRef.current) return;
    const kills: Array<() => void> = [];

    containerRef.current.querySelectorAll<HTMLElement>("[data-picado-wind]").forEach(el => {
      gsap.set(el, { transformOrigin: "top center", scaleY: 0, opacity: 0 });

      let windTweens: gsap.core.Tween[] = [];

      const startWind = () => {
        windTweens.forEach(t => t.kill());
        windTweens = [
          gsap.to(el, { skewX: 5, duration: 2.8, ease: "sine.inOut", repeat: -1, yoyo: true }),
          gsap.to(el, { scaleX: 1.025, y: -6, duration: 3.6, ease: "sine.inOut", repeat: -1, yoyo: true }),
        ];
      };

      const stopWind = () => {
        windTweens.forEach(t => t.kill());
        windTweens = [];
      };

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        onEnter: () => {
          gsap.to(el, {
            scaleY: 1, opacity: 1, duration: 1.4, ease: "elastic.out(1, 0.5)",
            onComplete: startWind,
          });
        },
        onLeaveBack: () => {
          stopWind();
          gsap.to(el, { scaleY: 0, opacity: 0, duration: 0.5, ease: "power2.in" });
        },
      });

      kills.push(() => { stopWind(); st.kill(); });
    });

    return () => kills.forEach(fn => fn());
  }, [invitadoData]);

  useEffect(() => {
    if (!invitadoData) return;
    const sections = sectionsRef.current.filter((s): s is HTMLElement => s != null);
    if (!sections.length) return;

    sections.forEach((section) => {
      if (!section) return;
      const title = section.querySelector("[data-animate-title]");
      const content = section.querySelector("[data-animate-content]");
      const decor = section.querySelectorAll("[data-animate-decor]");

      gsap.fromTo(
        section,
        {  },
        {
          duration: 0.6,
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "top 30%",
            scrub: 0.8,
          },
        }
      );

      if (title) {
        gsap.fromTo(
          title,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 85%", toggleActions: "play none none reverse" },
          }
        );
      }
      if (content) {
        gsap.fromTo(
          content,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            delay: 0.15,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 85%", toggleActions: "play none none reverse" },
          }
        );
      }
      decor.forEach((el, j) => {
        gsap.fromTo(
          el,
          { scale: 0, opacity: 0, rotation: -15 },
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.6,
            delay: j * 0.1,
            ease: "back.out(1.2)",
            scrollTrigger: { trigger: section, start: "top 80%", toggleActions: "play none none reverse" },
          }
        );
      });
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [invitadoData]);

  // Animaciones infinitas: estrellas (rotar, pulso), reloj (oscilación), algunas al hacer scroll
  useEffect(() => {
    if (!invitadoData) return;
    // Rotación lenta infinita (estrellas)
    gsap.utils.toArray<HTMLElement>("[data-gsap-rotate]").forEach((el) => {
      gsap.to(el, {
        rotation: 360,
        duration: 12 + Math.random() * 4,
        repeat: -1,
        ease: "none",
        transformOrigin: "center center",
      });
    });

    // Pulso: crecer y reducir en bucle (estrellas / lazos)
    // Movimiento suave arriba-abajo infinito (flotar)
    gsap.utils.toArray<HTMLElement>("[data-gsap-pulse]").forEach((el, i) => {
      gsap.to(el, {
        y: -12,
        duration: 2 + (i % 2) * 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    // Reloj: oscilar de un lado a otro (-18° a 18°)
    gsap.utils.toArray<HTMLElement>("[data-gsap-clock]").forEach((el) => {
      gsap.fromTo(
        el,
        { rotation: -18 },
        {
          rotation: 18,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "center center",
        }
      );
    });

    // Castillo: movimiento suave izquierda-derecha en bucle (vaivén)
    gsap.utils.toArray<HTMLElement>("[data-gsap-sway]").forEach((el) => {
      gsap.fromTo(
        el,
        { x: -10 },
        {
          x: 10,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }
      );
    });

    // Rotación ligada al scroll (estrella que gira al hacer scroll)
    gsap.utils.toArray<HTMLElement>("[data-gsap-scroll-rotate]").forEach((el) => {
      gsap.to(el, {
        rotation: 360,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
        transformOrigin: "center center",
      });
    });

    return () => {
      gsap.killTweensOf("[data-gsap-rotate], [data-gsap-pulse], [data-gsap-clock], [data-gsap-scroll-rotate], [data-gsap-sway]");
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [invitadoData]);

  const setSectionRef = (el: HTMLElement | null, index: number) => {
    if (el) sectionsRef.current[index] = el;
  };

  // Bucle infinito: lanzar 4 fuegos en Hero y en "Gracias" cada ~3.2s
  const fireworksIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!invitadoData) return;
    const startTimeout = setTimeout(() => {
      fireworksRefHero.current?.start();
      fireworksRefGracias.current?.start();
      fireworksRefHero.current?.launch(4);
      fireworksRefGracias.current?.launch(4);
      fireworksIntervalRef.current = setInterval(() => {
        fireworksRefHero.current?.launch(4);
        fireworksRefGracias.current?.launch(4);
      }, 3200);
    }, 800);
    return () => {
      clearTimeout(startTimeout);
      if (fireworksIntervalRef.current) clearInterval(fireworksIntervalRef.current);
    };
  }, [invitadoData]);

  // Música de fondo en bucle al entrar a la invitación
  useEffect(() => {
    if (!invitadoData) return;
    const audio = new Audio("/Assets/music/audio_fondo_2.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [invitadoData]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Slide-in desde los lados para las tarjetas de regalo
  useEffect(() => {
    if (!invitadoData || !containerRef.current) return;
    const kills: Array<() => void> = [];

    containerRef.current.querySelectorAll<HTMLElement>("[data-gift-card]").forEach((el, i) => {
      const fromX = i % 2 === 0 ? -80 : 80;
      gsap.set(el, { x: fromX, opacity: 0 });
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        onEnter: () => gsap.to(el, { x: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: i * 0.12 }),
        onLeaveBack: () => gsap.to(el, { x: fromX, opacity: 0, duration: 0.4, ease: "power2.in" }),
      });
      kills.push(() => st.kill());
    });

    return () => kills.forEach(fn => fn());
  }, [invitadoData]);

  // Text animations — must run last so all other GSAP anims are already set up
  useEffect(() => {
    if (!invitadoData || !containerRef.current) return;
    const cleanup = initTextAnimations(containerRef.current);

    // Al entrar por primera vez las imágenes no están cargadas aún y
    // ScrollTrigger calcula posiciones incorrectas. Refrescamos en dos
    // momentos: uno rápido para elementos que no dependen de imágenes,
    // y otro después de que las imágenes terminen de cargar.
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 300);

    const images = containerRef.current
      ? Array.from(containerRef.current.querySelectorAll<HTMLImageElement>("img"))
      : [];
    let pending = images.filter(img => !img.complete).length;

    if (pending === 0) {
      const t2 = setTimeout(() => ScrollTrigger.refresh(), 50);
      return () => { cleanup(); clearTimeout(t1); clearTimeout(t2); };
    }

    const onLoad = () => {
      pending--;
      if (pending === 0) ScrollTrigger.refresh();
    };
    images.forEach(img => { if (!img.complete) img.addEventListener("load", onLoad, { once: true }); });

    return () => {
      cleanup();
      clearTimeout(t1);
      images.forEach(img => img.removeEventListener("load", onLoad));
    };
  }, [invitadoData]);

  if (!hasCheckedStorage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8e8eb] overflow-hidden">
        <p className="text-[#D15366] font-medium">Cargando...</p>
      </div>
    );
  }

  if (invitadoData === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" style={{ background: "#FFDDD7" }}>
        {/* Blobs lava lamp */}
        <div className="login-blob-1 absolute -top-32 -left-32 w-[420px] h-[420px]" style={{ background: "#E58E90", filter: "blur(65px)", opacity: 0.75 }} />
        <div className="login-blob-2 absolute top-1/4 -right-36 w-[380px] h-[380px]" style={{ background: "#901F1A", filter: "blur(80px)", opacity: 0.45 }} />
        <div className="login-blob-3 absolute -bottom-36 left-1/3 w-[460px] h-[460px]" style={{ background: "#E58E90", filter: "blur(70px)", opacity: 0.65 }} />
        <div className="login-blob-4 absolute top-12 right-1/3 w-[320px] h-[320px]" style={{ background: "#901F1A", filter: "blur(90px)", opacity: 0.38 }} />
        <div className="login-blob-3 absolute -bottom-20 -left-20 w-[300px] h-[300px]" style={{ background: "#FFDDD7", filter: "blur(55px)", opacity: 0.9, animationDelay: "-5s" }} />

        {/* Card con efecto frosted glass */}
        <div className="relative z-10 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-[#901F1A]"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "#901F1A" }}>Bienvenido</h3>
          <p className="text-sm mb-4 text-center" style={{ color: "#901F1A", opacity: 0.75 }}>Ingresa el número de teléfono con el que fuiste invitado para continuar.</p>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="961 238 5401"
            value={formatPhoneDisplay(numeroInput)}
            onChange={(e) => setNumeroInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="w-full rounded-xl px-4 py-2 placeholder:text-[#E58E90]/60 mb-2 outline-none"
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1.5px solid rgba(144,31,26,0.3)",
              color: "#901F1A",
            }}
            maxLength={12}
          />
          {numeroError && <p className="text-sm text-red-600 mb-2">{numeroError}</p>}
          <button
            type="button"
            onClick={buscarInvitado}
            disabled={numeroLoading}
            className="w-full rounded-xl py-2 text-sm font-bold uppercase text-white disabled:opacity-60 transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #E58E90 0%, #901F1A 100%)" }}
          >
            {numeroLoading ? "Buscando..." : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="snap-sections relative min-h-screen md:w-1/3 mx-auto overflow-hidden">
      
      {/* Modal: elegir cantidad de pases al pulsar Asistiré */}
      {modalAsistireOpen && invitadoData && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={() => setModalAsistireOpen(false)}>
          <div className="bg-white  shadow-xl max-w-sm w-full p-6 text-[#993B4D]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold uppercase tracking-wider mb-2 text-center">Asistiré</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">Pases asignados: {invitadoData.pases}. Elige cuántos confirmas:</p>
            <select
              value={rsvpPasesElegidos}
              onChange={(e) => setRsvpPasesElegidos(Number(e.target.value))}
              className="w-full border-2 border-[#993B4D]/50 px-4 py-2 text-[#993B4D] mb-4 bg-white"
            >
              {Array.from({ length: invitadoData.pases }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "pase" : "pases"}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalAsistireOpen(false)} className="flex-1 border-2 border-[#993B4D] py-2 text-sm font-bold uppercase text-[#993B4D]">Cancelar</button>
              <button
                type="button"
                onClick={async () => {
                  await confirmarAsistencia(true);
                  setModalAsistireOpen(false);
                }}
                disabled={rsvpConfirming}
                className="flex-1 bg-[#993B4D] py-2 text-sm font-bold uppercase text-white disabled:opacity-60"
              >
                {rsvpConfirming ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Modal: confirmar "No asistiré" */}
      {modalNoAsistirOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={() => setModalNoAsistirOpen(false)}>
          <div className="bg-white shadow-xl max-w-sm w-full p-6 text-[#D15366]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#993B4D] uppercase tracking-wider mb-2 text-center">No asistiré</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">¿Confirmas que no asistirás?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalNoAsistirOpen(false)} className="flex-1 border-2 border-[#993B4D] py-2 text-sm font-bold uppercase text-[#993B4D]">Cancelar</button>
              <button
                type="button"
                onClick={async () => {
                  await confirmarAsistencia(false);
                  setModalNoAsistirOpen(false);
                }}
                disabled={rsvpConfirming}
                className="flex-1  bg-[#993B4D] py-2 text-sm font-bold uppercase text-white disabled:opacity-60"
              >
                {rsvpConfirming ? "Enviando..." : "Aceptar"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Fondo de la invitación (FONDO.png) en toda la página */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        // style={{
        //   backgroundImage: `url(${asset(ASSETS.recursos, "FONDO.png")})`,
        //   backgroundSize: "cover",
        //   backgroundPosition: "center",
        //   backgroundRepeat: "no-repeat",
        //   backgroundAttachment: "scroll",
        // }}
        aria-hidden
      />
        {/* <Birds count={4} /> */}
      {/* Contenido por encima del fondo para que los bg de las secciones se vean */}
      <div className="relative z-100 bg-[#FFFFFF] overflow-hidden">
      
      {/* Hero */}
      <section
        ref={(el) => setSectionRef(el, 0)}
        className="snap-section relative flex flex-col items-center justify-center gap-10 "
      >
        <div className="relative w-full min-h-screen overflow-hidden">

          {/* Fondo solo de esta sección: red_paper de base, foto enmarcada encima */}
          <Image data-animate-decor src={asset(ASSETS.elementos, "red_paper.png")} alt="" width={1080} height={1920} className="absolute inset-0 w-full h-full object-cover" priority />
          <div className="absolute inset-6 sm:inset-10 overflow-hidden">
            <Image data-animate-decor src={asset(ASSETS.fotos, "FOTO_PRINCIPAL.jpg")} alt="" width={1024} height={1534} className="w-full h-full object-cover py-10 brightness-80" priority />

            <div className="absolute inset-x-0 bottom-20 sm:bottom-10 text-center px-4">
              <div data-animate-title>
                <h2 data-text-anim="reveal" className="font-tritopani text-9xl sm:text-6xl text-[#901F1A] leading-[0.4]">
                  Ángel &
                </h2>
                <h2 data-text-anim="reveal" className="font-tritopani text-9xl sm:text-6xl text-[#901F1A] leading-[0.4]">
                  Karina
                </h2>
              </div>
              <p data-text-anim="reveal" className="mt-3 text-2xl sm:text-xl tracking-[0.35em] text-[#24406B]">
                12.11.2026
              </p>
            </div>
          </div>

          {/* Flores de esquina, las 4 a partir de un único asset (FLOR1.png) */}
          <Image data-animate-decor src={asset(ASSETS.elementos, "FLOR1.png")} alt="" width={700} height={700} className="pointer-events-none absolute -top-10 -right-10 w-sm sm:w-1/3 h-auto" priority />

        </div>
      </section>

      {/* Diseño de flores */}
      <div className="relative top-10 items-center justify-evenly">
        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -left-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -left-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -left-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 left-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 left-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_2.png")} alt="" width={300} height={300} className="pointer-events-none absolute -bottom-25 left-60 -translate-x-1/2 w-44 sm:w-1/3 h-auto rotate-180" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra2.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-38 sm:w-1/3 h-auto rotate-230" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "flor_blanca.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 right-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 right-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 right-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -right-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -right-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -right-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>
      </div>

      {/* Nombres - Novios */}
      <section
          ref={(el) => setSectionRef(el, 1)}
          className="snap-section relative z-20 flex flex-col items-center justify-center z-5 mb-15"
        >
          <div className=" w-full h-full text-center py-5 mt-30">
            <h2 data-text-anim="reveal" className="text-7xl font-tritopani">Ángel Eduardo</h2>
            <h2 data-text-anim="reveal" className="text-2xl uppercase">Hernández Ramírez</h2>
            <h2 data-text-anim="reveal" className="text-9xl font-tritopani leading-[0.4]">&</h2>
            <h2 data-text-anim="reveal" className="text-7xl font-tritopani">Karina Itzel</h2>
            <h2 data-text-anim="reveal" className="text-2xl uppercase">Figueroa González</h2>
          </div>
      </section>

      {/* Conteo regresivo */}
      <section
        ref={(el) => setSectionRef(el, 2)}
        className="snap-section relative flex flex-col items-center justify-center pb-20"
      >
        <Image src={asset(ASSETS.elementos, "red_paper.png")} alt="" width={1080} height={1920} className="absolute inset-0 w-full h-full object-cover" priority />

        <div className="relative flex flex-wrap items-start justify-evenly gap-3 sm:gap-3 w-full h-auto py-5">

        <div className=" w-full h-full text-center">
          <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Faltan:</h2>
        </div>
          {/* capa de fondo — recibe el efecto tela+viento sin afectar los números */}
          <div  className="absolute inset-0"
            style={{
              backgroundImage: `url(${asset(ASSETS.elementos, "papel_picado_CONTADOR.png")})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-3xl font-semibold text-white sm:text-5xl md:text-6xl">{countdown.days}</span>
            <span className="text-xs uppercase tracking-wider text-white/90">Días</span>
          </div>
          <span className="relative z-10 text-4xl font-semibold text-white/80">:</span>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-3xl font-semibold text-white sm:text-5xl md:text-6xl">{countdown.hours}</span>
            <span className="text-xs uppercase tracking-wider text-white/90">Horas</span>
          </div>
          <span className="relative z-10 text-4xl font-semibold text-white/80">:</span>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-3xl font-semibold text-white sm:text-5xl md:text-6xl">{countdown.minutes}</span>
            <span className="text-xs uppercase tracking-wider text-white/90">Min</span>
          </div>
          <span className="relative z-10 text-4xl font-semibold text-white/80">:</span>
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-3xl font-semibold text-white sm:text-5xl md:text-6xl">{countdown.seconds}</span>
            <span className="text-xs uppercase tracking-wider text-white/90">Seg</span>
          </div>
        </div>
      </section>

      {/* Diseño de flores */}
      <div className="relative top-10 items-center justify-evenly z-10" >
        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -left-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -left-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -left-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 left-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 left-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_2.png")} alt="" width={300} height={300} className="pointer-events-none absolute -bottom-25 left-60 -translate-x-1/2 w-44 sm:w-1/3 h-auto rotate-180" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra2.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-38 sm:w-1/3 h-auto rotate-230" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "flor_blanca.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 right-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 right-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 right-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -right-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -right-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -right-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>
      </div>

      {/* Lista de Padrinos */}
      <section
          ref={(el) => setSectionRef(el, 1)}
          className="snap-section relative z-20 flex flex-col items-center justify-center z-5 mb-15"
        >
          <div className="text-center py-5 mt-30">
            <div>
              <h2 data-text-anim="reveal" className="text-7xl font-tritopani">Nuestros padrinos</h2>
            </div>

            <div className="w-full h-full">
              <h2 data-text-anim="reveal" className="text-xl uppercase italic my-4">Padrinos de velación:</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">ALBERTINA RAMÍREZ <br /> MORENO</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">&</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">FRANCISCO JAVIER <br /> RIVERA MARTÍNEZ</h2>
              <Image data-animate-decor src={asset(ASSETS.elementos, "RAMO_AZUL.png")} alt="" width={300} height={300} className="pointer-events-none mx-auto mt-10 w-32 sm:w-1/3 h-auto" priority />
            </div>

            <div className="w-full h-full">
              <h2 data-text-anim="reveal" className="text-xl uppercase italic my-4">MADRINAS DE ANILLO:</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">MARGOT FIGUEROA <br /> VÁZQUEZ</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">&</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">Laura Patricia <br /> Figueroa Vázquez</h2>
              <Image data-animate-decor src={asset(ASSETS.elementos, "RAMO_AZUL.png")} alt="" width={300} height={300} className="pointer-events-none mx-auto mt-10 w-32 sm:w-1/3 h-auto" priority />
            </div>

            <div className="w-full h-full">
              <h2 data-text-anim="reveal" className="text-xl uppercase italic my-4">Padrinos de Lazos:</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">Oralia Figueroa <br /> Vázquez</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">&</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">Miguel Esteban <br /> De La Cruz Cansino</h2>
              <Image data-animate-decor src={asset(ASSETS.elementos, "RAMO_AZUL.png")} alt="" width={300} height={300} className="pointer-events-none mx-auto mt-10 w-32 sm:w-1/3 h-auto" priority />
            </div>

            <div className="w-full h-full">
              <h2 data-text-anim="reveal" className="text-xl uppercase italic my-4">Padrinos de Brindis:</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">María del Carmen <br /> Figueroa Vázquez</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">&</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">Eduardo Victoria <br /> Alboreso</h2>
              <Image data-animate-decor src={asset(ASSETS.elementos, "RAMO_AZUL.png")} alt="" width={300} height={300} className="pointer-events-none mx-auto mt-10 w-32 sm:w-1/3 h-auto" priority />
            </div>
      
            <div className="w-full h-full">
              <h2 data-text-anim="reveal" className="text-xl uppercase italic my-4">Padrinos de Arras:</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">Dori Cruz <br /> Rodríguez González</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">&</h2>
              <h2 data-text-anim="reveal" className="text-2xl uppercase">José Dario <br /> Barrios Roblero</h2>
            </div>
          </div>
      </section>

      {/* Fecha, lugar, código de vestimenta y regalo */}
      <section
        ref={(el) => setSectionRef(el, 2)}
        className="snap-section relative flex flex-col items-center justify-center pb-20"
      >
        <Image src={asset(ASSETS.elementos, "red_paper.png")} alt="" width={1080} height={1920} className="absolute inset-0 w-full h-full object-cover" priority />

        <div className="relative flex flex-wrap items-start justify-evenly gap-3 sm:gap-3 w-full h-auto py-5">

          <div className=" w-full h-full text-center my-3">
            <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Fecha:</h2>
            <div className="flex flex-row items-center justify-center gap-4 h-full">
              <img src={asset(ASSETS.elementos, "ICONOS-FECHA.png")} alt="" className="w-16"/>
              <h2 data-text-anim="reveal" className="text-xl text-white uppercase text-left leading-6">12 de <br /> octubre <br /> 2026</h2>
            </div>
          </div>
  
          <div className=" w-full h-full text-center my-3">
            <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Misa religiosa:</h2>
            <div className="flex flex-row items-center justify-center gap-4 h-full">
              <img src={asset(ASSETS.elementos, "ICONOS-PARROQUIA.png")} alt="" className="w-20"/>
              <h2 data-text-anim="reveal" className="text-xl text-white uppercase text-left leading-6">04 PM <br /> <span className="text-base">PARROQUIA DE</span> <br /> NUESTRA SEÑORA <br /> DEL SAGRADO <br /> CORAZÓN</h2>
            </div>
            <a
              href={ENLACE_ITEM_1}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#993B4D] text-[#ffffff] mt-6 px-6 py-2 text-center text-xs font-bold uppercase tracking-wider shadow-lg transition hover:bg-[#b84556] active:scale-[0.98]"
              >
              ver ubicación
            </a>
          </div>

          <div className=" w-full h-full text-center my-3">
            <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Recepción:</h2>
            <div className="flex flex-row items-center justify-center gap-4 h-full">
              <img src={asset(ASSETS.elementos, "ICONOS-PARROQUIA.png")} alt="" className="w-20"/>
              <h2 data-text-anim="reveal" className="text-xl text-white uppercase text-left leading-6">05 PM <br /> Hotel casa <br /> kolping</h2>
            </div>
            <a
              href={ENLACE_ITEM_2}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#993B4D] text-[#ffffff] mt-6 px-6 py-2 text-center text-xs font-bold uppercase tracking-wider shadow-lg transition hover:bg-[#b84556] active:scale-[0.98]"
              >
              ver ubicación
            </a>
          </div>

          <div className="w-full h-full text-center my-3">
            <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Vestimenta:</h2>
            <p data-text-anim="reveal" className="text-white uppercase text-center text-sm leading-5">COCKTAIL/RIGUROSA FORMALIDAD  <br />DE NOCHE</p>
            <div className="flex flex-row items-center justify-center gap-4 h-full my-4">
              <div>
                <img src={asset(ASSETS.elementos, "ICONOS-VESTIDO.png")} alt="" className="w-24 mx-auto my-3"/>
                <p data-text-anim="reveal" className="text-white uppercase text-center text-sm leading-5">VESTIDOS LARGOS O <br /> DE CÓCTEL A LA RODILLA</p>
              </div>
              <div>
                <img src={asset(ASSETS.elementos, "ICONOS-TRAJE.png")} alt="" className="w-24 mx-auto my-3"/>
                <p data-text-anim="reveal" className="text-white uppercase text-center text-sm leading-5">TRAJE SASTRE FORMAL  <br />EN TONOS OSCUROS</p>
              </div>
            </div>
          </div>

          <div className="w-full h-full text-center my-3">
            <p data-text-anim="reveal" data-text-split="words" className="text-white uppercase text-center text-sm leading-5 border-2 border-[#993B4D] mx-5 p-3">Les pedimos amablemente evitar atuendos en tonos blanco/marfil, así como en gama vino y azul, ya que estos colores están reservados de forma exclusiva para los novios y nuestra corte de honor.</p>
          </div>

          <div className="w-full h-full text-center my-3">
            <h2 data-text-anim="reveal" className="text-7xl text-white font-tritopani">Mesa de reglos:</h2>
            <div className="flex flex-row items-center justify-center gap-4 h-full">
              <img src={asset(ASSETS.elementos, "ICONOS-REGALOS.png")} alt="" className="w-20"/>
              <h2 data-text-anim="reveal" className="text-4xl text-white uppercase text-left leading-6">lIVERPOOL</h2>
            </div>
            <a
              href={ENLACE_ITEM_3}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-[#993B4D] text-[#FFFFFF] mt-6 px-6 py-2 text-center text-xs font-bold uppercase tracking-wider shadow-lg transition hover:bg-[#b84556] active:scale-[0.98]"
              >
              abrir mesa de regalos
            </a>
          </div>

          {/* Flores de esquina, las 4 a partir de un único asset (FLOR1.png) */}
          <Image data-animate-decor src={asset(ASSETS.elementos, "FLOR1.png")} alt="" width={700} height={700} className="pointer-events-none absolute -top-10 -right-10 w-56 sm:w-1/3 h-auto" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "FLOR1.png")} alt="" width={700} height={700} className="pointer-events-none absolute -top-10 -left-10 w-56 sm:w-1/3 h-auto -scale-x-100 " priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "FLOR1.png")} alt="" width={700} height={700} className="pointer-events-none absolute -bottom-30 -left-10 w-56 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "FLOR1.png")} alt="" width={700} height={700} className="pointer-events-none absolute -bottom-30 -right-10 w-56 sm:w-1/3 h-auto -scale-x-100 rotate-180" priority />
        
        </div>
      </section>

      {/* RSVP */}
      <section
          ref={(el) => setSectionRef(el, 4)}
          className="snap-section relative flex flex-col items-center justify-center z-5 h-auto my-20"
        >
        <div className=" inset-0 overflow-hidden">

        </div>
        <div data-animate-title className="mb-2 w-full max-w-md" />
        <div className="relative w-full max-w-md">
          <h2 className="text-8xl font-tritopani text-center leading-8">
            Confirma tu <br /> asistencia
          </h2>
          <div className=" inset-0 flex flex-col items-center justify-center px-4 sm:px-12 w-80 m-auto">
            <div data-animate-title className="w-full text-center text-2xl my-10">
              <h2 className="">{invitadoData.nombre}</h2>
            </div>
            {/* <div data-animate-content className="mt-4 w-full max-w-[200px] mx-auto text-center">
              <h2 className="text-lg font-semibold uppercase tracking-wider text-[#ffddd7]">{invitadoData.nombre}</h2>
            </div> */}
            {invitadoData.confirmado ? (
              <div data-anim-pop className="mt-4 text-center">
                {invitadoData.pasesConfirmados > 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl font-bold text-[#993B4D] uppercase tracking-wide">¡Te esperamos!</p>
                    {invitadoData.pasesConfirmados > 1 && (
                      <p className="text-xs text-[#993B4D]/80">{invitadoData.pasesConfirmados} pases confirmados</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-lg font-semibold text-[#993B4D] uppercase tracking-wide">Gracias por avisar</p>
                    <p className="text-xs text-[#993B4D]/80">Lamentamos que no puedas acompañarnos.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {numeroError && <p className="text-sm text-red-600 mb-2 text-center">{numeroError}</p>}
                <div data-anim-pop className="mt-6 flex flex-col gap-1 flex-row justify-around w-full items-center">
                  <button
                    type="button"
                    onClick={() => setModalNoAsistirOpen(true)}
                    disabled={rsvpConfirming}
                    className="border-2 border-[#993B4D] bg-transparent px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#993B4D] transition hover:/10 active:scale-[0.98] disabled:opacity-60"
                  >
                    No asistiré
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAsistireOpen(true)}
                    disabled={rsvpConfirming}
                    className=" text-[#ffffff] bg-[#993B4D] px-6 py-2 text-center text-xs font-bold uppercase tracking-wider shadow-lg transition hover:bg-[#b84556] active:scale-[0.98] disabled:opacity-60"
                  >
                    Asistiré
                  </button>
                </div>
              </>
            )}
            {/* <p className="mt-5 text-center text-xs text-[#D15366] uppercase">
              En caso de que no puedas asistir después de la fecha límite, contacta directamente.
            </p> */}
          </div>
        </div>
      </section>

      {/* Diseño de flores */}
      <div className="relative top-20 items-center justify-evenly z-10" >
        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -left-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -left-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -left-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 left-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 left-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_2.png")} alt="" width={300} height={300} className="pointer-events-none absolute -bottom-25 left-60 -translate-x-1/2 w-44 sm:w-1/3 h-auto rotate-180" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra2.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-38 sm:w-1/3 h-auto rotate-230" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "flor_blanca.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 right-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 right-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 right-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -right-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -right-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -right-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>
      </div>

     {/* Galeria de fotos */}
      <div>
        <section
          ref={(el) => setSectionRef(el, 2)}
          className="snap-section relative flex flex-col items-center justify-center pb-20"
        >
          <Image src={asset(ASSETS.elementos, "red_paper.png")} alt="" width={1080} height={1920} className="absolute inset-0 w-full h-full object-cover" priority />

          <div className="relative w-full px-10">
            <h2 data-text-anim="reveal" className="mb-6 text-center text-5xl text-white font-tritopani">Nuestra Historia</h2>

            <div className="relative w-full aspect-[3/4] overflow-hidden border-4 border-[#FFDDD7]/80 shadow-lg">
              {GALERIA_FOTOS.map((foto, i) => (
                <Image
                  key={foto}
                  src={asset(ASSETS.fotos, foto)}
                  alt=""
                  fill
                  priority={i === 0}
                  className={`object-cover transition-opacity duration-500 ${i === galeriaIndex ? "opacity-100" : "opacity-0"}`}
                />
              ))}

              <button
                type="button"
                onClick={() => setGaleriaIndex((i) => (i - 1 + GALERIA_FOTOS.length) % GALERIA_FOTOS.length)}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#901F1A]/85 text-[#FFDDD7] shadow-md transition active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setGaleriaIndex((i) => (i + 1) % GALERIA_FOTOS.length)}
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#901F1A]/85 text-[#FFDDD7] shadow-md transition active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex justify-center gap-2">
              {GALERIA_FOTOS.map((foto, i) => (
                <button
                  key={foto}
                  type="button"
                  onClick={() => setGaleriaIndex(i)}
                  aria-label={`Ir a la foto ${i + 1}`}
                  className={`h-2 w-2 rounded-full transition ${i === galeriaIndex ? "bg-[#FFDDD7]" : "bg-[#FFDDD7]/40"}`}
                />
              ))}
            </div>
          </div>

        </section>
      </div>

      {/* Diseño de flores */}
      <div className="relative top-20 items-center justify-evenly z-10" >
        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -left-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -left-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -left-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 left-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 left-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_2.png")} alt="" width={300} height={300} className="pointer-events-none absolute -bottom-25 left-60 -translate-x-1/2 w-44 sm:w-1/3 h-auto rotate-180" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra2.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-38 sm:w-1/3 h-auto rotate-230" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "flor_blanca.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 right-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 right-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 right-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -right-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -right-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -right-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>
      </div>

      {/* Nombres - Novios */}
      <section
          ref={(el) => setSectionRef(el, 1)}
          className="snap-section relative z-20 flex flex-col items-center justify-center z-5 mb-15"
        >
          <div className=" w-full h-full text-center py-15 mt-30">
            <h2 data-text-anim="reveal" className="text-7xl font-tritopani">Ángel Eduardo</h2>
            <h2 data-text-anim="reveal" className="text-2xl uppercase">Hernández Ramírez</h2>
            <h2 data-text-anim="reveal" className="text-9xl font-tritopani leading-[0.4]">&</h2>
            <h2 data-text-anim="reveal" className="text-7xl font-tritopani">Karina Itzel</h2>
            <h2 data-text-anim="reveal" className="text-2xl uppercase">Figueroa González</h2>
          </div>
      </section>

      {/* Diseño de flores */}
      <div className="relative top-20 items-center justify-evenly z-10 h-auto" >
        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -left-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -left-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -left-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 left-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 left-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_2.png")} alt="" width={300} height={300} className="pointer-events-none absolute -bottom-25 left-60 -translate-x-1/2 w-44 sm:w-1/3 h-auto rotate-180" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra2.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-38 sm:w-1/3 h-auto rotate-230" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "flor_blanca.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-25 right-15 w-46 sm:w-1/3 h-auto rotate-190" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra3.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-15 right-20 w-38 sm:w-1/3 h-auto rotate-120" priority />
            <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_azul.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 right-23 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>

        <div className="">  
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_1.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-20 -right-10 w-40 sm:w-1/3 h-auto rotate-180" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "rama_extra.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-10 -right-10 w-34 sm:w-1/3 h-auto rotate-70" priority />
          <Image data-animate-decor src={asset(ASSETS.elementos, "Flor_roja.png")} alt="" width={100} height={100} className="pointer-events-none absolute -bottom-1 -right-3 w-36 sm:w-1/3 h-auto rotate-190" priority />
        </div>
      </div>

      </div>

      {/* Botón flotante de música */}
      <button
        type="button"
        onClick={toggleMusic}
        aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
        className="fixed bottom-6 right-6 z-[9998] flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #D15366 0%, #901F1A 100%)",
          boxShadow: "0 4px 20px rgba(209,83,102,0.5)",
        }}
      >
        {isPlaying ? (
          /* Ícono pausa */
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          /* Ícono play */
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        )}
        {/* Anillo pulsante cuando está reproduciendo */}
        {isPlaying && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: "linear-gradient(135deg, #D15366, #901F1A)" }}
          />
        )}
      </button>
    </div>
  );
}
