import { forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { GoogleMapsContext } from '@vis.gl/react-google-maps';

export interface CircleProps extends google.maps.CircleOptions {
  center: google.maps.LatLngLiteral;
  radius: number;
  onClick?: (e: google.maps.MapMouseEvent) => void;
}

export const Circle = forwardRef<google.maps.Circle | null, CircleProps>((props, ref) => {
  const { center, radius, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWeight, onClick, zIndex } = props;
  const map = useContext(GoogleMapsContext)?.map;
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.Circle) return;

    const circle = new google.maps.Circle({
      center,
      radius,
      fillColor: fillColor || '#10B981',
      fillOpacity: fillOpacity ?? 0.15,
      strokeColor: strokeColor || '#10B981',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 2,
      zIndex: zIndex ?? 1,
      map
    });

    circleRef.current = circle;

    let listener: google.maps.MapsEventListener | null = null;
    if (onClick) {
      listener = circle.addListener('click', onClick);
    }

    return () => {
      if (listener) listener.remove();
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    circle.setCenter(center);
    circle.setRadius(radius);
    circle.setOptions({
      fillColor: fillColor || '#10B981',
      fillOpacity: fillOpacity ?? 0.15,
      strokeColor: strokeColor || '#10B981',
      strokeOpacity: strokeOpacity ?? 0.8,
      strokeWeight: strokeWeight ?? 2,
      zIndex: zIndex ?? 1
    });
  }, [center, radius, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWeight, zIndex]);

  useImperativeHandle(ref, () => circleRef.current);

  return null;
});
