import { useEffect, useState } from 'react';
import { useCRM } from '../../context/CRMContext';

export default function Toast() {
  const { toast } = useCRM();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [toast]);

  if (!toast) return null;
  return (
    <div className={`toast${visible ? ' show' : ''}`} style={{ zIndex: 9999 }}>
      {toast.msg}
    </div>
  );
}
