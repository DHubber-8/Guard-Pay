// Vector artwork drawn in code (sharp at any screen size, unlike stretched photos).
// Colours follow the moodboard: navy / steel blue waves under a peach-terracotta sky.

function Paint({ id, scale = 14, freq = 0.011 }) {
  // Wobbly, painted-looking edges + a fine paper grain
  return (
    <defs>
      <filter id={`${id}-paint`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="3" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id={`${id}-grain`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0.08  0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0.09 0" />
      </filter>
    </defs>
  );
}

/** Hero background: dunes / mountain waves (inspired by moodboard image 1). */
export function HeroArt() {
  return (
    <svg className="art-svg" viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Paint id="hero" scale={18} />
      <defs>
        <linearGradient id="hero-sky" x1="1" y1="0" x2="0.2" y2="0.8">
          <stop offset="0" stopColor="#d98a72" />
          <stop offset="0.45" stopColor="#efc2a8" />
          <stop offset="1" stopColor="#f7e3d3" />
        </linearGradient>
        <linearGradient id="hero-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a4c62" />
          <stop offset="1" stopColor="#142a38" />
        </linearGradient>
      </defs>
      <rect width="1440" height="760" fill="url(#hero-sky)" />
      <g filter="url(#hero-paint)">
        <path d="M-20 120 C 300 160 520 60 860 140 C 1100 200 1260 150 1460 110 L1460 -20 L-20 -20Z" fill="#e3a58c" opacity=".45" />
        <path d="M-20 60 C 220 300 420 420 660 470 C 840 505 980 430 1160 400 C 1300 378 1400 390 1460 396 L1460 780 L-20 780Z" fill="#b8ccd8" />
        <path d="M-20 160 C 200 360 420 500 650 525 C 870 548 1030 470 1210 452 C 1330 440 1410 452 1460 458 L1460 780 L-20 780Z" fill="#8eacbf" />
        <path d="M-20 300 C 240 440 460 565 710 565 C 910 565 1090 505 1270 492 C 1370 486 1430 492 1460 496 L1460 780 L-20 780Z" fill="#5f87a1" />
        <path d="M-20 430 C 300 520 540 625 780 615 C 1000 606 1190 560 1460 556 L1460 780 L-20 780Z" fill="#3b6580" />
        <path d="M-20 560 C 360 610 700 700 1010 676 C 1210 660 1350 640 1460 640 L1460 780 L-20 780Z" fill="url(#hero-deep)" />
      </g>
      <rect width="1440" height="760" filter="url(#hero-grain)" />
    </svg>
  );
}

/** Auth panel: a painted ribbon across a sand background (inspired by moodboard image 7). */
export function AuthArt() {
  return (
    <svg className="art-svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Paint id="auth" scale={22} freq={0.009} />
      <defs><linearGradient id="auth-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf6f2" /><stop offset="1" stopColor="#f5e9e1" /></linearGradient></defs>
      <rect width="800" height="1000" fill="url(#auth-sand)" />
      <g filter="url(#auth-paint)">
        <path d="M-60 820 C 160 700 360 720 540 640 C 680 578 760 560 880 560 L880 640 C 760 650 680 680 560 740 C 380 830 180 830 -60 920Z" fill="#f2c8ad" opacity=".9" />
        <path d="M-60 870 C 160 760 360 770 540 700 C 680 645 770 625 880 625 L880 700 C 770 706 680 735 560 790 C 380 872 180 880 -60 960Z" fill="#8fb0c4" opacity=".9" />
        <path d="M-60 920 C 170 815 370 820 550 760 C 690 712 780 690 880 690 L880 790 C 780 790 690 815 560 860 C 380 925 180 940 -60 1010Z" fill="#3f7590" />
        <path d="M-60 965 C 180 870 380 870 560 820 C 700 780 790 760 880 760 L880 840 C 790 842 700 865 570 905 C 390 960 200 985 -60 1040Z" fill="#1f3b4d" />
      </g>
      <rect width="800" height="1000" filter="url(#auth-grain)" />
    </svg>
  );
}

/** Soft, low-key decoration for plain sections. kind: "blobs" | "waves" | "lines" */
export function Deco({ kind = "blobs", tone = "warm" }) {
  if (kind === "waves") {
    const c = tone === "dark" ? "#4f7a94" : "#b8ccd8";
    return (
      <svg className="deco" viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ top: "auto", bottom: 0, height: 200 }} aria-hidden="true">
        <path d="M0 120 C 240 70 480 170 720 120 C 960 70 1200 160 1440 110 L1440 200 L0 200Z" fill={c} opacity={tone === "dark" ? 0.25 : 0.35} />
        <path d="M0 160 C 260 120 520 200 760 160 C 1000 120 1220 190 1440 150 L1440 200 L0 200Z" fill={c} opacity={tone === "dark" ? 0.35 : 0.45} />
      </svg>
    );
  }
  if (kind === "lines") {
    return (
      <svg className="deco" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M-20 ${120 + i * 40} C 300 ${60 + i * 40} 600 ${220 + i * 40} 900 ${140 + i * 40} S 1300 ${80 + i * 40} 1460 ${130 + i * 40}`}
            fill="none" stroke={i === 2 ? "#c4a052" : "#4f7a94"} strokeWidth={i === 2 ? 1.5 : 1} opacity={i === 2 ? 0.55 : 0.35} />
        ))}
      </svg>
    );
  }
  const colors = tone === "cool" ? ["#dde8ee", "#f2cdb8"] : ["#f2cdb8", "#dde8ee"];
  return (
    <div className="deco" aria-hidden="true">
      <span className="blob" style={{ width: 520, height: 520, right: -160, top: -200, background: colors[0] }} />
      <span className="blob" style={{ width: 420, height: 420, left: -180, bottom: -220, background: colors[1] }} />
    </div>
  );
}

/** Light painted waves for the top of app pages (sits behind the content and fades out). */
export function PageArt() {
  return (
    <div className="page-art" aria-hidden="true">
      <svg viewBox="0 0 1440 360" preserveAspectRatio="xMidYMin slice">
        <Paint id="page" scale={16} />
        <defs>
          <linearGradient id="page-sky" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4cdb6" />
            <stop offset=".5" stopColor="#f8e6d8" />
            <stop offset="1" stopColor="#fbf7f1" />
          </linearGradient>
        </defs>
        <rect width="1440" height="360" fill="url(#page-sky)" />
        <g filter="url(#page-paint)">
          <path d="M-20 150 C 220 90 420 190 640 170 C 860 150 1040 70 1240 90 C 1340 100 1410 120 1460 130 L1460 380 L-20 380Z" fill="#dce8ee" />
          <path d="M-20 210 C 240 170 470 250 720 230 C 940 212 1120 160 1300 170 C 1380 175 1430 185 1460 190 L1460 380 L-20 380Z" fill="#c4d6e0" opacity=".9" />
          <path d="M-20 260 C 300 240 560 300 820 285 C 1040 272 1240 240 1460 245 L1460 380 L-20 380Z" fill="#a9c2d1" opacity=".55" />
          <path d="M760 40 C 900 20 1080 60 1240 30 C 1340 12 1410 20 1460 30 L1460 -20 L760 -20Z" fill="#eaa98f" opacity=".55" />
        </g>
        <circle cx="1180" cy="120" r="46" fill="#c4a052" opacity=".22" />
        <circle cx="1240" cy="96" r="6" fill="#c4a052" opacity=".7" />
        <circle cx="210" cy="70" r="4" fill="#d9826a" opacity=".7" />
        <rect width="1440" height="360" filter="url(#page-grain)" />
      </svg>
    </div>
  );
}

/** Full-page vector backgrounds (sharp at any size). kind: "dunes" | "ribbon" */
export function Backdrop({ kind = "dunes" }) {
  if (kind === "brush") {
    // Light blue wall with diagonal paint strokes (inspired by moodboard image 6)
    const specks = Array.from({ length: 70 }, (_, i) => {
      const x = (i * 137.5) % 640, y = (i * 89.3) % 380;
      return <circle key={i} cx={40 + x} cy={30 + y} r={(i % 4) + 1.2} fill="#ffffff" opacity={0.55 - (i % 5) * 0.08} />;
    });
    return (
      <div className="backdrop" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <Paint id="bbg" scale={30} freq={0.006} />
          <defs>
            <linearGradient id="bbg-wall" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#a9d0d8" /><stop offset=".55" stopColor="#c6e0e4" /><stop offset="1" stopColor="#eef4f3" />
            </linearGradient>
            <linearGradient id="bbg-cream" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#f7ece6" /><stop offset="1" stopColor="#fbf1ec" />
            </linearGradient>
            <linearGradient id="bbg-peach" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6c0a4" /><stop offset="1" stopColor="#f09a6c" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#bbg-wall)" />
          <g opacity=".9">{specks}</g>
          <g filter="url(#bbg-paint)">
            <path d="M120 900 L560 300 C 640 220 760 200 860 150 L1100 40 L1240 120 L760 520 L420 900Z" fill="url(#bbg-cream)" opacity=".95" />
            <path d="M-40 900 L320 520 C 420 430 520 420 640 360 L900 240 L960 320 L560 640 L260 900Z" fill="#fdf6f2" opacity=".9" />
            <path d="M700 900 L960 560 C 1040 470 1140 420 1240 360 L1500 200 L1500 900Z" fill="#f8e3d8" opacity=".95" />
            <path d="M1180 340 C 1260 300 1340 250 1460 190 L1480 520 C 1400 560 1320 600 1250 640 C 1200 560 1180 450 1180 340Z" fill="url(#bbg-peach)" opacity=".9" />
            <path d="M1260 120 C 1320 100 1400 80 1470 60 L1480 210 C 1420 230 1360 250 1290 270Z" fill="#f4b08c" opacity=".55" />
            <path d="M80 150 C 160 120 260 90 360 100 C 300 140 220 190 120 230Z" fill="#f3a77f" opacity=".6" />
            <path d="M220 260 C 280 230 360 210 420 205 C 380 240 310 280 240 300Z" fill="#f3a77f" opacity=".45" />
          </g>
          <path d="M300 860 C 340 820 380 790 420 770" stroke="#4f8fa6" strokeWidth="3" strokeLinecap="round" opacity=".35" fill="none" />
          <rect width="1440" height="900" filter="url(#bbg-grain)" />
        </svg>
      </div>
    );
  }
  if (kind === "ribbon") {
    return (
      <div className="backdrop" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <Paint id="rbg" scale={24} freq={0.008} />
          <defs>
            <linearGradient id="rbg-sky" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4f7f9" /><stop offset="1" stopColor="#f6e7dc" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#rbg-sky)" />
          <g filter="url(#rbg-paint)">
            <path d="M-80 560 C 260 430 560 470 860 380 C 1080 314 1260 280 1520 270 L1520 360 C 1270 372 1090 410 880 470 C 580 556 280 540 -80 660Z" fill="#f2c8ad" opacity=".9" />
            <path d="M-80 630 C 260 510 560 540 870 450 C 1090 388 1270 356 1520 350 L1520 440 C 1270 448 1100 484 890 545 C 590 630 290 620 -80 730Z" fill="#d9826a" opacity=".85" />
            <path d="M-80 700 C 270 590 570 610 880 525 C 1100 466 1280 436 1520 430 L1520 540 C 1280 546 1110 580 900 636 C 600 716 300 716 -80 820Z" fill="#3f7590" />
            <path d="M-80 770 C 280 670 580 680 890 600 C 1110 545 1290 520 1520 515 L1520 620 C 1290 628 1120 660 910 712 C 610 790 310 800 -80 900Z" fill="#1f3b4d" />
          </g>
          <circle cx="1220" cy="150" r="70" fill="#c4a052" opacity=".18" />
          <circle cx="1300" cy="120" r="8" fill="#c4a052" opacity=".6" />
          <rect width="1440" height="900" filter="url(#rbg-grain)" />
        </svg>
      </div>
    );
  }
  return (
    <div className="backdrop" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <Paint id="dbg" scale={20} />
        <defs>
          <linearGradient id="dbg-sky" x1="1" y1="0" x2="0.1" y2="0.9">
            <stop offset="0" stopColor="#e7a58c" /><stop offset=".45" stopColor="#f3d3bf" /><stop offset="1" stopColor="#f8e9dd" />
          </linearGradient>
          <linearGradient id="dbg-deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a4c62" /><stop offset="1" stopColor="#17303f" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#dbg-sky)" />
        <g filter="url(#dbg-paint)">
          <path d="M-20 300 C 260 360 520 470 760 500 C 960 525 1120 470 1300 450 C 1380 442 1430 446 1460 450 L1460 920 L-20 920Z" fill="#c9d9e3" />
          <path d="M-20 400 C 240 470 480 580 740 600 C 960 616 1120 560 1300 545 C 1390 538 1440 542 1460 545 L1460 920 L-20 920Z" fill="#9dbacb" />
          <path d="M-20 520 C 280 580 520 680 790 690 C 1000 698 1180 650 1460 640 L1460 920 L-20 920Z" fill="#6a90a8" />
          <path d="M-20 640 C 320 690 600 780 880 775 C 1100 770 1290 735 1460 730 L1460 920 L-20 920Z" fill="#3f6882" />
          <path d="M-20 760 C 380 800 720 860 1040 845 C 1230 836 1370 820 1460 818 L1460 920 L-20 920Z" fill="url(#dbg-deep)" />
        </g>
        <circle cx="1180" cy="170" r="60" fill="#c4a052" opacity=".2" />
        <rect width="1440" height="900" filter="url(#dbg-grain)" />
      </svg>
    </div>
  );
}

/** Painted texture for a light card (peach paper with soft strokes and grain). */
const CARD_TONES = {
  peach: { bg: "#fbefe7", a: "#f2c8ad", b: "#e7a58c", c: "#d9826a", top: "#f2cdb8" },
  mist: { bg: "#eef4f7", a: "#c9d9e3", b: "#9dbacb", c: "#6a90a8", top: "#dde8ee" },
};
export function CardArt({ tone = "peach" }) {
  const t = CARD_TONES[tone];
  const id = `card-${tone}`;
  return (
    <svg className="card-art" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Paint id={id} scale={18} freq={0.012} />
      <rect width="600" height="400" fill={t.bg} />
      <g filter={`url(#${id}-paint)`}>
        <path d="M260 420 C 340 330 430 290 640 230 L640 420Z" fill={t.a} opacity=".75" />
        <path d="M340 420 C 410 360 500 330 640 300 L640 420Z" fill={t.b} opacity=".6" />
        <path d="M430 420 C 480 390 560 370 640 360 L640 420Z" fill={t.c} opacity=".5" />
        <path d="M380 -20 C 450 40 540 70 640 80 L640 -20Z" fill={t.top} opacity=".8" />
      </g>
      <circle cx="520" cy="110" r="40" fill="#c4a052" opacity=".16" />
      <rect width="600" height="400" filter={`url(#${id}-grain)`} />
    </svg>
  );
}
