import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'earn' | 'spend' | 'info';
}

let nextId = 0;
let listeners: ((msg: ToastMessage) => void)[] = [];

export function showToast(text: string, type: ToastMessage['type'] = 'info') {
  const msg: ToastMessage = { id: nextId++, text, type };
  listeners.forEach((fn) => fn(msg));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev.slice(-4), msg]); // max 5
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 2000);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.type}`}
            initial={{ y: -20, scale: 0.85, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -12, scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            layout
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
