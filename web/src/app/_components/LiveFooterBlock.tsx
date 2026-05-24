"use client";

import { useEffect, useState } from "react";

export function LiveFooterBlock() {
  const [block, setBlock] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d: { latestBlock: string }) => {
          if (d.latestBlock && d.latestBlock !== "0") setBlock(d.latestBlock);
        })
        .catch(() => {});
    }
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="rj-legal">
      v0.1.4 · agent uptime 99.97% · last block{" "}
      <span style={{ color: "var(--rj-paper)" }}>
        {block ? Number(block).toLocaleString() : "…"}
      </span>
    </span>
  );
}
