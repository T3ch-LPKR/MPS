"use client";

import { useEffect, useRef } from "react";

type Pt = { lat: number; lng: number; label: string; type: "done" | "plan" };

declare global { interface Window { L: any } }

function ensureLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link");
      l.id = "leaflet-css"; l.rel = "stylesheet";
      l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(l);
    }
    let s = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script");
      s.id = "leaflet-js"; s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = () => resolve(window.L);
      document.body.appendChild(s);
    } else {
      s.addEventListener("load", () => resolve(window.L));
      if (window.L) resolve(window.L);
    }
  });
}

export default function MapClient({ points }: { points: Pt[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    ensureLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const center: [number, number] = points.length ? [points[0].lat, points[0].lng] : [-6.2, 106.8];
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, 12);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);

      const done = points.filter((p) => p.type === "done");
      const line: [number, number][] = [];
      points.forEach((p, i) => {
        const color = p.type === "done" ? "#16a34a" : "#d81f26";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35);display:grid;place-items:center"><span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:11px">${i + 1}</span></div>`,
          iconSize: [24, 24], iconAnchor: [12, 24],
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b>${i + 1}. ${p.label}</b><br>${p.type === "done" ? "Sudah check-in" : "Terjadwal"}`);
        if (p.type === "done") line.push([p.lat, p.lng]);
      });
      if (line.length > 1) L.polyline(line, { color: "#16a34a", weight: 3, opacity: .6, dashArray: "6,7" }).addTo(map);
      const all = points.map((p) => [p.lat, p.lng]) as [number, number][];
      if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.25));
    });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [points]);

  return <div ref={ref} style={{ height: 340, borderRadius: 12, overflow: "hidden", zIndex: 0 }} className="border border-line" />;
}
