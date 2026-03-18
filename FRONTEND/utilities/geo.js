export const DEFAULT_USER_LOCATION = Object.freeze({
  lat: 44.8015,
  lng: 10.3279,
  label: "Parma",
});

export const BUY_LISTINGS_RADIUS_METERS = 10_000;

const EARTH_RADIUS_METERS = 6_371_000;

function toFiniteNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function normalizeCoordinates(value) {
  if (!value || typeof value !== "object") return null;

  const lat = toFiniteNumber(value.lat ?? value.latitude);
  const lng = toFiniteNumber(value.lng ?? value.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
}

export function hasValidCoordinates(value) {
  return Boolean(normalizeCoordinates(value));
}

export function getListingCoordinates(listing) {
  return normalizeCoordinates({
    latitude: listing?.latitude,
    longitude: listing?.longitude,
  });
}

export function roundCoordinatesPair(value, precision = 6) {
  const coordinates = normalizeCoordinates(value);
  if (!coordinates) return null;

  const factor = 10 ** precision;
  return {
    lat: Math.round(coordinates.lat * factor) / factor,
    lng: Math.round(coordinates.lng * factor) / factor,
  };
}

export function areCoordinatesEqual(leftValue, rightValue, tolerance = 0.000001) {
  const leftCoordinates = normalizeCoordinates(leftValue);
  const rightCoordinates = normalizeCoordinates(rightValue);

  if (!leftCoordinates || !rightCoordinates) return false;

  return (
    Math.abs(leftCoordinates.lat - rightCoordinates.lat) <= tolerance
    && Math.abs(leftCoordinates.lng - rightCoordinates.lng) <= tolerance
  );
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(fromValue, toValue) {
  const from = normalizeCoordinates(fromValue);
  const to = normalizeCoordinates(toValue);

  if (!from || !to) return Number.POSITIVE_INFINITY;

  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function isWithinRadiusMeters(fromValue, toValue, radiusMeters) {
  const normalizedRadius = Number(radiusMeters);
  if (!Number.isFinite(normalizedRadius) || normalizedRadius < 0) return false;

  return haversineDistanceMeters(fromValue, toValue) <= normalizedRadius;
}

export function formatCoordinatesLabel(value, precision = 5) {
  const coordinates = normalizeCoordinates(value);
  if (!coordinates) return "-";

  return `${coordinates.lat.toFixed(precision)}, ${coordinates.lng.toFixed(precision)}`;
}
