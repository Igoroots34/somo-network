import { useEffect, useRef, useState } from "react";
import { FiLock } from "react-icons/fi";
import { motion } from "framer-motion";

type EncryptButtonProps = {
  /** Texto base para revelar (se não usar children) */
  text?: string;
  /** Elemento opcional à esquerda (ícone, etc.) */
  leftIcon?: React.ReactNode;
  /** Clique do botão */
  onClick?: () => void;
  /** Ciclos por letra (mais alto = animação mais longa) */
  cyclesPerLetter?: number; // default 2
  /** Intervalo em ms entre trocas */
  shuffleTime?: number; // default 50
  /** Conjunto de caracteres usados na “bagunça” */
  chars?: string; // default "!@#$%^&*():{};|,.<>/?"
  /** Desabilita hover e faz a animação iniciar no mount */
  autoStart?: boolean;
  /** Classes extras */
  className?: string;
  /** Children tem prioridade sobre text */
  children?: React.ReactNode;
};

const EncryptButton: React.FC<EncryptButtonProps> = ({
  text,
  leftIcon = <FiLock />,
  onClick,
  cyclesPerLetter = 2,
  shuffleTime = 50,
  chars = "!@#$%^&*():{};|,.<>/?",
  autoStart = false,
  className = "",
  children,
}) => {
  const targetText = String(children ?? text ?? "Entrar na Sala");
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const [display, setDisplay] = useState(targetText);

  // Reinicia exibição se o texto alvo mudar
  useEffect(() => {
    stopScramble();
    setDisplay(targetText);
    if (autoStart) startScramble(targetText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetText, autoStart, cyclesPerLetter, shuffleTime, chars]);

  // Limpa intervalo ao desmontar
  useEffect(() => {
    return () => stopScramble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScramble = (value: string) => {
    if (runningRef.current) return; // evita múltiplos intervals
    runningRef.current = true;

    let pos = 0;
    const total = Math.max(1, Math.ceil(value.length * cyclesPerLetter));

    intervalRef.current = window.setInterval(() => {
      const scrambled = value.split("").map((char, index) => {
        // já “revela” a letra quando chegou na vez dela
        if (pos / cyclesPerLetter > index) return char;

        const r = Math.floor(Math.random() * chars.length);
        return chars[r] ?? char;
      }).join("");

      setDisplay(scrambled);
      pos++;

      if (pos >= total) {
        stopScramble();
        setDisplay(value);
      }
    }, shuffleTime);
  };

  const stopScramble = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    runningRef.current = false;
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      onMouseEnter={() => startScramble(targetText)}
      onMouseLeave={() => { stopScramble(); setDisplay(targetText); }}
      className={`group relative overflow-hidden rounded-lg border border-neutral-600 px-4 py-2 font-mono font-medium uppercase text-neutral-600 transition-colors hover:text-[#FFD700] hover:border-[#FFD700] ${className}`}
    >
      <div className="relative z-10 flex items-center gap-2">
        {leftIcon}
        <span>{display}</span>
      </div>

      {/* brilho animado */}
      <motion.span
        initial={{ y: "100%" }}
        animate={{ y: "-100%" }}
        transition={{ repeat: Infinity, repeatType: "mirror", duration: 1, ease: "linear" }}
        className="absolute inset-0 z-0 scale-125 bg-gradient-to-t from-[#FFD700]/0 from-40% via-[#FFD700]/100 to-[#FFD700]/0 to-60% opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </motion.button>
  );
};

export default EncryptButton;
