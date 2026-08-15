"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";

import type { PhotoLocation } from "@/types/revelar";

type Coordinates = { latitude: number; longitude: number };

export function OpenMap({
  locations,
  selectedId,
  onSelect,
  editablePosition,
  onPositionChange,
  compact = false,
}: {
  locations: PhotoLocation[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  editablePosition?: Coordinates;
  onPositionChange?: (position: Coordinates) => void;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markerLayer = useRef<LayerGroup | null>(null);
  const editableMarker = useRef<Marker | null>(null);
  const lastEditablePosition = useRef<Coordinates | null>(null);
  const latestOnSelect = useRef(onSelect);
  const latestOnPositionChange = useRef(onPositionChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latestOnSelect.current = onSelect;
    latestOnPositionChange.current = onPositionChange;
  }, [onPositionChange, onSelect]);

  useEffect(() => {
    if (!root.current || map.current) return;
    let active = true;
    void import("leaflet").then((L) => {
      if (!active || !root.current || map.current) return;
      const instance = L.map(root.current, { zoomControl: true, attributionControl: true }).setView(
        [-8.0522, -34.9286],
        11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(instance);
      instance.on("click", (event) => {
        latestOnPositionChange.current?.({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });
      map.current = instance;
      markerLayer.current = L.layerGroup().addTo(instance);
      setReady(true);
      const refreshSize = () => instance.invalidateSize({ pan: false });
      window.requestAnimationFrame(refreshSize);
      window.setTimeout(refreshSize, 180);
      const observer = new ResizeObserver(refreshSize);
      observer.observe(root.current);
      instance.once("unload", () => observer.disconnect());
    });
    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
      markerLayer.current = null;
      editableMarker.current = null;
      lastEditablePosition.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !markerLayer.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !map.current || !markerLayer.current) return;
      markerLayer.current.clearLayers();
      const bounds: [number, number][] = [];
      locations.forEach((location) => {
        const selected = location.id === selectedId;
        const icon = L.divIcon({
          className: "revelar-map-marker-wrap",
          html: `<span class="revelar-map-marker ${selected ? "selected" : ""}" aria-hidden="true"></span>`,
          iconSize: [32, 40],
          iconAnchor: [16, 38],
        });
        L.marker([location.latitude, location.longitude], { icon })
          .bindTooltip(location.name, { direction: "top", offset: [0, -32] })
          .on("click", () => latestOnSelect.current?.(location.id))
          .addTo(markerLayer.current!);
        bounds.push([location.latitude, location.longitude]);
      });
      if (!editablePosition && bounds.length > 1)
        map.current.fitBounds(bounds, { padding: [42, 42], maxZoom: 13 });
      else if (!editablePosition && bounds.length === 1) map.current.setView(bounds[0], 14);
    });
    return () => {
      cancelled = true;
    };
  }, [editablePosition, locations, ready, selectedId]);

  useEffect(() => {
    if (!map.current || !editablePosition) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !map.current) return;
      const previous = lastEditablePosition.current;
      const shouldCenter =
        !previous ||
        Math.abs(previous.latitude - editablePosition.latitude) > 0.000001 ||
        Math.abs(previous.longitude - editablePosition.longitude) > 0.000001;
      editableMarker.current?.remove();
      const icon = L.divIcon({
        className: "revelar-map-marker-wrap",
        html: '<span class="revelar-map-marker selected draggable" aria-hidden="true"></span>',
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });
      const marker = L.marker([editablePosition.latitude, editablePosition.longitude], {
        icon,
        draggable: true,
      }).addTo(map.current);
      marker.on("dragend", () => {
        const next = marker.getLatLng();
        latestOnPositionChange.current?.({ latitude: next.lat, longitude: next.lng });
      });
      editableMarker.current = marker;
      lastEditablePosition.current = editablePosition;
      const refresh = () => {
        if (!map.current) return;
        map.current.invalidateSize({ pan: false });
        if (shouldCenter)
          map.current.setView([editablePosition.latitude, editablePosition.longitude], 15, {
            animate: false,
          });
      };
      window.requestAnimationFrame(refresh);
      window.setTimeout(refresh, 120);
      window.setTimeout(refresh, 320);
    });
    return () => {
      cancelled = true;
    };
  }, [editablePosition, ready]);

  return <div ref={root} className={`open-map ${compact ? "compact" : ""}`} />;
}
