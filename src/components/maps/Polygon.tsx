import { forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { GoogleMapsContext } from '@vis.gl/react-google-maps';

export interface PolygonProps extends google.maps.PolygonOptions {
  paths: google.maps.LatLngLiteral[];
  onClick?: (e: google.maps.MapMouseEvent) => void;
}

export const Polygon = forwardRef<google.maps.Polygon | null, PolygonProps>((props, ref) => {
  const { paths, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWeight, onClick, zIndex } = props;
  const map = useContext(GoogleMapsContext)?.map;
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.Polygon) return;

    const polygon = new google.maps.Polygon({
      paths,
      fillColor: fillColor || '#3B82F6',
      fillOpacity: fillOpacity ?? 0.15,
      strokeColor: strokeColor || '#3B82F6',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 2,
      zIndex: zIndex ?? 1,
      map
    });

    polygonRef.current = polygon;

    let listener: google.maps.MapsEventListener | null = null;
    if (onClick) {
      listener = polygon.addListener('click', onClick);
    }

    return () => {
      if (listener) listener.remove();
      polygon.setMap(null);
      polygonRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const polygon = polygonRef.current;
    if (!polygon) return;

    polygon.setPaths(paths);
    polygon.setOptions({
      fillColor: fillColor || '#3B82F6',
      fillOpacity: fillOpacity ?? 0.15,
      strokeColor: strokeColor || '#3B82F6',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 2,
      zIndex: zIndex ?? 1
    });
  }, [paths, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWeight, zIndex]);

  useImperativeHandle(ref, () => polygonRef.current);

  return null;
});
