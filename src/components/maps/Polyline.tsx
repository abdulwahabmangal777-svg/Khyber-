import { forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { GoogleMapsContext, useMapsLibrary } from '@vis.gl/react-google-maps';

export interface PolylineProps extends google.maps.PolylineOptions {
  encodedPath?: string;
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
}

export const Polyline = forwardRef<google.maps.Polyline | null, PolylineProps>((props, ref) => {
  const {
    path,
    encodedPath,
    strokeColor,
    strokeOpacity,
    strokeWeight,
    onClick,
    onMouseOver,
    onMouseOut,
    icons,
    zIndex
  } = props;
  const map = useContext(GoogleMapsContext)?.map;
  const geometryLibrary = useMapsLibrary('geometry');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // Initialize polyline when map is ready and google.maps is loaded
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.Polyline) return;

    const polyline = new google.maps.Polyline({
      strokeColor: strokeColor || '#3B82F6',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 4,
      zIndex: zIndex ?? 1,
      icons,
      map
    });

    polylineRef.current = polyline;

    const listeners: google.maps.MapsEventListener[] = [];
    if (onClick) listeners.push(polyline.addListener('click', onClick));
    if (onMouseOver) listeners.push(polyline.addListener('mouseover', onMouseOver));
    if (onMouseOut) listeners.push(polyline.addListener('mouseout', onMouseOut));

    return () => {
      listeners.forEach(l => l.remove());
      polyline.setMap(null);
      polylineRef.current = null;
    };
  }, [map]);

  // Update path / options
  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    if (encodedPath && geometryLibrary?.encoding) {
      const decoded = geometryLibrary.encoding.decodePath(encodedPath);
      polyline.setPath(decoded);
    } else if (path) {
      polyline.setPath(path);
    }

    polyline.setOptions({
      strokeColor: strokeColor || '#3B82F6',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 4,
      zIndex: zIndex ?? 1,
      icons
    });
  }, [path, encodedPath, strokeColor, strokeOpacity, strokeWeight, zIndex, icons, geometryLibrary]);

  useImperativeHandle(ref, () => polylineRef.current, []);

  return null;
});

Polyline.displayName = 'Polyline';
