"use client";

import { useEffect, useState } from "react";

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-muted text-sm py-10 text-center">
        加载中…
      </div>
    );
  }
  return <>{children}</>;
}
