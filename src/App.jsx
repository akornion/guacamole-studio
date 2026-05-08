import React from "react";
import gsLogo from "./assets/GSLogo.svg";

const SCRAMBLE_DURATION_MS = 1600;
const SCRAMBLE_STAGGER_MS = 520;
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
        {isScrambling
          ? Array.from(displayText).map((character, index) => (
              <span className="scramble-text__character" key={`${index}-${character}`}>
                {character === " " ? "\u00A0" : character || "\u00A0"}
              </span>
            ))
          : displayText}
      </span>
    </span>
  );
}

function App() {
  const [phraseIndex, setPhraseIndex] = React.useState(0);
  const hasAnimated = React.useRef(false);
  const activePhrase = phrases[phraseIndex];
  const longestText = React.useMemo(
    () => phrases.reduce((longest, phrase) => (phrase.text.length > longest.length ? phrase.text : longest), ""),
    [],
  );

  React.useEffect(() => {
    const transitionOffset = hasAnimated.current ? SCRAMBLE_DURATION_MS : 0;
    const timeoutId = window.setTimeout(() => {
      hasAnimated.current = true;
      setPhraseIndex((current) => (current + 1) % phrases.length);
    }, activePhrase.holdMs + transitionOffset);

    return () => window.clearTimeout(timeoutId);
  }, [activePhrase.holdMs, phraseIndex]);

  return (
    <main className="construction-page">
      <p className="sr-only">
        A digital studio for ideas that needed a stranger kitchen. The kitchen is still being built.
      </p>
      <section className="construction-lockup" aria-label="Guacamole Studio under construction">
        <img className="construction-logo" src={gsLogo} alt="Guacamole Studio" draggable="false" />
        <h1 className="construction-line">
          <ScrambleText text={activePhrase.text} longestText={longestText} />
        </h1>
      </section>
      <small className="copyright">© 2026 Guacamole Studio™</small>
    </main>
  );
}

export default App;
