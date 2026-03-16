import { useEffect, useState } from 'react';

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
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
