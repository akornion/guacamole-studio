import React from "react";
import gsLogo from "./assets/GSLogo.svg";
import gsLogoMarkup from "./assets/GSLogo.svg?raw";

const SCRAMBLE_DURATION_MS = 1600;
const SCRAMBLE_STAGGER_MS = 520;
const INTRO_DRAW_DURATION_MS = 1500;
const INTRO_EASE_IN_MS = 250;
const INTRO_EASE_OUT_MS = 500;
const INTRO_EASE_DISTANCE = 0.125;
const INTRO_COMPOSE_DURATION_MS = 1120;
const INTRO_TOTAL_DURATION_MS = INTRO_DRAW_DURATION_MS + INTRO_COMPOSE_DURATION_MS;
const SCRAMBLE_CHARS = Array.from(
  "abcdefghijklmnopqrstuvwxyz" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "0123456789" +
    "⟐⟡⧫◌◍◎◈◇◆" +
    "•·*+~<>/{}[]",
);

const phrases = [
  {
    text: "A digital studio for ideas that needed a stranger kitchen.",
    holdMs: 5000,
  },
  {
    text: "The kitchen is still being built.",
    holdMs: 3000,
  },
];

const WORDMARK_PATH_MARKUP = (gsLogoMarkup.match(/<path[^>]+>/g) ?? [])
  .filter((_, index) => index !== 9)
  .join("");

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);

    return () => media.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getRandomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

function centerOutProgress(elapsed, index, total) {
  if (total <= 1) {
    return Math.min(1, elapsed / SCRAMBLE_DURATION_MS);
  }

  const center = (total - 1) / 2;
  const maxDistance = Math.max(center, total - 1 - center);
  const distance = Math.abs(index - center);
  const delay = (distance / maxDistance) * SCRAMBLE_STAGGER_MS;
  const activeDuration = SCRAMBLE_DURATION_MS - SCRAMBLE_STAGGER_MS;

  return Math.max(0, Math.min(1, (elapsed - delay) / activeDuration));
}

function ScrambleText({ text, longestText }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const previousText = React.useRef(text);
  const [displayText, setDisplayText] = React.useState(text);
  const [isScrambling, setIsScrambling] = React.useState(false);

  React.useEffect(() => {
    if (previousText.current === text) {
      setIsScrambling(false);
      setDisplayText(text);
      return undefined;
    }

    if (prefersReducedMotion) {
      previousText.current = text;
      setIsScrambling(false);
      setDisplayText(text);
      return undefined;
    }

    const fromText = previousText.current;
    const total = Math.max(fromText.length, text.length);
    const startedAt = performance.now();
    let frameId = 0;
    setIsScrambling(true);

    const animate = (now) => {
      const elapsed = now - startedAt;
      const nextChars = Array.from({ length: total }, (_, index) => {
        const progress = centerOutProgress(elapsed, index, total);
        const targetChar = text[index] ?? "";
        const sourceChar = fromText[index] ?? "";

        if (progress >= 1) {
          return targetChar;
        }

        if (progress <= 0) {
          return sourceChar;
        }

        if (targetChar === " " || sourceChar === " ") {
          return progress > 0.62 ? targetChar : sourceChar;
        }

        return progress > 0.78 ? targetChar : getRandomScrambleChar();
      });

      setDisplayText(nextChars.join(""));

      if (elapsed < SCRAMBLE_DURATION_MS) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        previousText.current = text;
        setIsScrambling(false);
        setDisplayText(text);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [prefersReducedMotion, text]);

  return (
    <span className="scramble-text" aria-hidden="true">
      <span className="scramble-text__sizer" aria-hidden="true">
        {longestText}
      </span>
      <span className="scramble-text__visible">
        {Array.from(displayText).map((character, index) => (
          <span className="scramble-text__character" key={`${index}-${character}`}>
            {character === " " ? "\u00A0" : character || "\u00A0"}
          </span>
        ))}
      </span>
    </span>
  );
}

function getDirectDrawProgress(elapsed) {
  if (elapsed <= INTRO_EASE_IN_MS) {
    const easeProgress = elapsed / INTRO_EASE_IN_MS;
    return easeProgress * easeProgress * INTRO_EASE_DISTANCE;
  }

  if (elapsed >= INTRO_DRAW_DURATION_MS - INTRO_EASE_OUT_MS) {
    const easeProgress = (elapsed - (INTRO_DRAW_DURATION_MS - INTRO_EASE_OUT_MS)) / INTRO_EASE_OUT_MS;
    const easedDistance = 1 - (1 - easeProgress) * (1 - easeProgress);
    return 1 - INTRO_EASE_DISTANCE + easedDistance * INTRO_EASE_DISTANCE;
  }

  const linearElapsed = elapsed - INTRO_EASE_IN_MS;
  const linearDuration = INTRO_DRAW_DURATION_MS - INTRO_EASE_IN_MS - INTRO_EASE_OUT_MS;
  const linearDistance = 1 - INTRO_EASE_DISTANCE * 2;

  return INTRO_EASE_DISTANCE + (linearElapsed / linearDuration) * linearDistance;
}

function LogoWordmarkArtwork({ className }) {
  return <g className={className} dangerouslySetInnerHTML={{ __html: WORDMARK_PATH_MARKUP }} />;
}

function IntroLogo({ onComplete }) {
  const pathRef = React.useRef(null);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    const startedAt = performance.now();
    const completeTimeoutId = window.setTimeout(onComplete, INTRO_TOTAL_DURATION_MS);

    const tick = (now) => {
      const elapsed = Math.min(now - startedAt, INTRO_DRAW_DURATION_MS);
      const drawProgress = getDirectDrawProgress(elapsed);

      if (pathRef.current) {
        pathRef.current.style.strokeDasharray = `${drawProgress} 1`;
      }

      if (elapsed < INTRO_DRAW_DURATION_MS) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    if (pathRef.current) {
      pathRef.current.style.strokeDasharray = "0 1";
      pathRef.current.style.strokeDashoffset = "0";
    }

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      window.clearTimeout(completeTimeoutId);
    };
  }, [onComplete]);

  return (
    <svg className="intro-logo-compose" viewBox="0 0 1260 141" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="intro-guacamole-clip" clipPathUnits="userSpaceOnUse">
          <rect x="0" y="0" width="656.5" height="141" />
        </clipPath>
        <clipPath id="intro-studio-clip" clipPathUnits="userSpaceOnUse">
          <rect x="880" y="0" width="380" height="141" />
        </clipPath>
      </defs>
      <g className="intro-lockup-motion">
        <g clipPath="url(#intro-guacamole-clip)">
          <LogoWordmarkArtwork className="intro-wordmark intro-wordmark--guacamole" />
        </g>
        <path
          ref={pathRef}
          className="intro-draw-icon__path"
          d="M806.458 9.05398L789.666 8.61177L755.416 8.16956C749.061 8.16956 746.007 8.61177 743.45 8.85691C717.492 11.3468 696.944 32.0155 694.468 58.1255C694.225 60.697 694.225 63.7685 694.225 70.1614C694.225 76.5543 694.225 79.6258 694.468 82.1974C696.944 108.307 717.492 129.418 743.45 131.908C746.007 132.153 795.027 132.153 800.982 131.735C844.291 130.913 844 88.6383 844 88.6383C844 63.533 822.515 46.7384 800.781 46.7384L741.94 46.6856C734.094 46.6808 727.714 53.04 727.652 60.9326C727.59 68.8828 733.96 75.3671 741.859 75.4055L799.061 75.6795C806.726 75.718 812.919 81.9763 812.919 89.6862C812.919 97.4202 806.683 103.693 798.994 103.693H747.412"
          pathLength="1"
        />
        <g clipPath="url(#intro-studio-clip)">
          <LogoWordmarkArtwork className="intro-wordmark intro-wordmark--studio" />
        </g>
      </g>
    </svg>
  );
}

function ConstructionPage({ isIntroComplete, onIntroComplete, shouldUseIntroLogo }) {
  const [phraseIndex, setPhraseIndex] = React.useState(0);
  const hasAnimated = React.useRef(false);
  const activePhrase = phrases[phraseIndex];
  const longestText = React.useMemo(
    () => phrases.reduce((longest, phrase) => (phrase.text.length > longest.length ? phrase.text : longest), ""),
    [],
  );

  React.useEffect(() => {
    if (!isIntroComplete) {
      return undefined;
    }

    const transitionOffset = hasAnimated.current ? SCRAMBLE_DURATION_MS : 0;
    const timeoutId = window.setTimeout(() => {
      hasAnimated.current = true;
      setPhraseIndex((current) => (current + 1) % phrases.length);
    }, activePhrase.holdMs + transitionOffset);

    return () => window.clearTimeout(timeoutId);
  }, [activePhrase.holdMs, isIntroComplete, phraseIndex]);

  return (
    <main className="construction-page">
      <p className="sr-only">
        A digital studio for ideas that needed a stranger kitchen. The kitchen is still being built.
      </p>
      <section className="construction-lockup" aria-label="Guacamole Studio under construction">
        {shouldUseIntroLogo ? (
          <div className="logo-reveal">
            <IntroLogo onComplete={onIntroComplete} />
          </div>
        ) : (
          <img className="construction-logo" src={gsLogo} alt="Guacamole Studio" draggable="false" />
        )}
        <h1 className={`construction-line${isIntroComplete ? " construction-line--visible" : ""}`}>
          <ScrambleText text={activePhrase.text} longestText={longestText} />
        </h1>
      </section>
      <small className="copyright">© 2026 Guacamole Studio™</small>
    </main>
  );
}

function App() {
  const [isIntroComplete, setIsIntroComplete] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const completeIntro = React.useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setIsIntroComplete(true);
    }
  }, [prefersReducedMotion]);

  return (
    <ConstructionPage
      isIntroComplete={isIntroComplete}
      onIntroComplete={completeIntro}
      shouldUseIntroLogo={!prefersReducedMotion}
    />
  );
}

export default App;
