<script setup>
import { normalizeCoordinates } from "@/utilities/geo";
import { useGeoapify } from "@/composables/useGeoapify";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  center: {
    type: Object,
    default: null,
  },
  zoom: {
    type: Number,
    default: 13,
  },
  minHeight: {
    type: [Number, String],
    default: 320,
  },
  markers: {
    type: Array,
    default: () => [],
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  allowSetMarker: {
    type: Boolean,
    default: false,
  },
  selectedMarkerDraggable: {
    type: Boolean,
    default: false,
  },
  showSelectedMarker: {
    type: Boolean,
    default: true,
  },
  showCenterMarker: {
    type: Boolean,
    default: false,
  },
  centerLabel: {
    type: String,
    default: "",
  },
  centerRadiusMeters: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["update:modelValue", "marker-click", "map-click", "map-ready"]);

const geoapify = useGeoapify();
const mapRootRef = ref(null);
const isMapReady = ref(false);
const tileErrorMessage = ref("");

let leaflet = null;
let map = null;
let tileLayer = null;
let markersLayer = null;
let selectedMarker = null;
let centerMarker = null;
let centerCircle = null;

const shellStyle = computed(() => {
  const parsedValue = Number(props.minHeight);
  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return { "--leaflet-map-min-height": `${parsedValue}px` };
  }

  return { "--leaflet-map-min-height": String(props.minHeight ?? "320px") };
});

const selectedCoordinates = computed(() => normalizeCoordinates(props.modelValue));
const centerCoordinates = computed(() => normalizeCoordinates(props.center));
const normalizedMarkers = computed(() => {
  return (Array.isArray(props.markers) ? props.markers : [])
    .map((marker) => {
      const coordinates = normalizeCoordinates(marker);
      if (!coordinates) return null;

      return {
        ...marker,
        lat: coordinates.lat,
        lng: coordinates.lng,
      };
    })
    .filter(Boolean);
});

function getMapZoom() {
  if (!map) return props.zoom;
  return map.getZoom();
}

function setMapView(targetCoordinates, zoom = null) {
  if (!map || !targetCoordinates) return;
  map.setView([targetCoordinates.lat, targetCoordinates.lng], zoom ?? getMapZoom());
}

function createDivIcon({ html, className, iconSize, iconAnchor }) {
  if (!leaflet || !html) return null;

  return leaflet.divIcon({
    html,
    className: className ?? "app-leaflet-div-icon",
    iconSize: Array.isArray(iconSize) ? iconSize : [48, 66],
    iconAnchor: Array.isArray(iconAnchor) ? iconAnchor : [24, 66],
  });
}

function createSelectedMarkerIcon() {
  return createDivIcon({
    html: '<span class="app-leaflet-selection-pin"></span>',
    className: "app-leaflet-div-icon app-leaflet-div-icon--selection",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createCenterMarkerIcon() {
  return createDivIcon({
    html: '<span class="app-leaflet-center-dot"></span>',
    className: "app-leaflet-div-icon app-leaflet-div-icon--center",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function syncTileLayer() {
  const tileUrl = geoapify.tileUrl.value;
  if (!leaflet || !map || !tileUrl) return;

  const shouldRecreate = !tileLayer || tileLayer._url !== tileUrl;
  if (!shouldRecreate) return;

  if (tileLayer) {
    tileLayer.removeFrom(map);
    tileLayer = null;
  }

  tileLayer = leaflet.tileLayer(tileUrl, {
    attribution: geoapify.tileAttribution,
    maxZoom: 20,
  }).addTo(map);

  tileLayer.on("loading", () => {
    tileErrorMessage.value = "";
  });

  tileLayer.on("tileerror", () => {
    tileErrorMessage.value = "Le tile della mappa non sono state caricate correttamente.";
  });
}

function syncExternalMarkers() {
  if (!leaflet || !markersLayer) return;

  markersLayer.clearLayers();

  normalizedMarkers.value.forEach((marker) => {
    const markerInstance = leaflet.marker([marker.lat, marker.lng], {
      icon: createDivIcon(marker),
      keyboard: false,
    });

    markerInstance.on("click", (event) => {
      leaflet.DomEvent.stopPropagation(event);
      emit("marker-click", marker);
    });

    markersLayer.addLayer(markerInstance);
  });
}

function removeSelectedMarker() {
  if (!selectedMarker || !map) return;
  selectedMarker.removeFrom(map);
  selectedMarker = null;
}

function syncSelectedMarker({ recenter = false } = {}) {
  if (!leaflet || !map) return;

  const coordinates = selectedCoordinates.value;

  if (!props.showSelectedMarker || !coordinates) {
    removeSelectedMarker();
    return;
  }

  if (!selectedMarker) {
    selectedMarker = leaflet.marker([coordinates.lat, coordinates.lng], {
      draggable: props.selectedMarkerDraggable,
      icon: createSelectedMarkerIcon(),
    }).addTo(map);

    selectedMarker.on("dragend", () => {
      const nextLatLng = selectedMarker?.getLatLng?.();
      if (!nextLatLng) return;

      emit("update:modelValue", {
        lat: nextLatLng.lat,
        lng: nextLatLng.lng,
      });
    });
  } else {
    selectedMarker.setLatLng([coordinates.lat, coordinates.lng]);
    selectedMarker.dragging?.[props.selectedMarkerDraggable ? "enable" : "disable"]?.();
  }

  if (recenter) {
    setMapView(coordinates, Math.max(getMapZoom(), props.zoom));
  }
}

function removeCenterArtifacts() {
  if (centerMarker && map) {
    centerMarker.removeFrom(map);
    centerMarker = null;
  }

  if (centerCircle && map) {
    centerCircle.removeFrom(map);
    centerCircle = null;
  }
}

function syncCenterArtifacts() {
  if (!leaflet || !map) return;

  const coordinates = centerCoordinates.value;
  const hasVisibleCenter = Boolean(coordinates) && (props.showCenterMarker || props.centerRadiusMeters > 0);

  if (!hasVisibleCenter) {
    removeCenterArtifacts();
    return;
  }

  if (props.showCenterMarker) {
    if (!centerMarker) {
      centerMarker = leaflet.marker([coordinates.lat, coordinates.lng], {
        keyboard: false,
        icon: createCenterMarkerIcon(),
      }).addTo(map);
    } else {
      centerMarker.setLatLng([coordinates.lat, coordinates.lng]);
    }

    if (props.centerLabel) {
      centerMarker.bindTooltip(props.centerLabel, {
        direction: "top",
        opacity: 0.92,
      });
    }
  } else if (centerMarker) {
    centerMarker.removeFrom(map);
    centerMarker = null;
  }

  if (props.centerRadiusMeters > 0) {
    if (!centerCircle) {
      centerCircle = leaflet.circle([coordinates.lat, coordinates.lng], {
        radius: props.centerRadiusMeters,
        color: "rgba(56, 189, 248, 0.65)",
        weight: 1,
        fillColor: "rgba(56, 189, 248, 0.12)",
        fillOpacity: 0.25,
      }).addTo(map);
    } else {
      centerCircle.setLatLng([coordinates.lat, coordinates.lng]);
      centerCircle.setRadius(props.centerRadiusMeters);
    }
  } else if (centerCircle) {
    centerCircle.removeFrom(map);
    centerCircle = null;
  }
}

function handleMapClick(event) {
  if (!props.allowSetMarker) return;

  const nextCoordinates = {
    lat: event.latlng.lat,
    lng: event.latlng.lng,
  };

  emit("update:modelValue", nextCoordinates);
  emit("map-click", nextCoordinates);
}

async function initializeMap() {
  if (!mapRootRef.value || !geoapify.isConfigured.value || map) return;

  const leafletModule = await import("leaflet");
  leaflet = leafletModule.default ?? leafletModule;

  map = leaflet.map(mapRootRef.value, {
    zoomControl: true,
    attributionControl: true,
    dragging: props.interactive,
    scrollWheelZoom: props.interactive,
    doubleClickZoom: props.interactive,
    boxZoom: props.interactive,
    keyboard: props.interactive,
    tap: props.interactive,
  });

  markersLayer = leaflet.layerGroup().addTo(map);
  map.on("click", handleMapClick);

  syncTileLayer();
  syncExternalMarkers();
  syncSelectedMarker({ recenter: true });
  syncCenterArtifacts();

  const initialCoordinates = selectedCoordinates.value ?? centerCoordinates.value;
  if (initialCoordinates) {
    setMapView(initialCoordinates, props.zoom);
  }

  isMapReady.value = true;
  emit("map-ready", map);
}

function destroyMap() {
  removeSelectedMarker();
  removeCenterArtifacts();

  if (markersLayer) {
    markersLayer.clearLayers();
  }

  if (map) {
    map.off("click", handleMapClick);
    map.remove();
    map = null;
  }

  tileLayer = null;
  markersLayer = null;
  leaflet = null;
  isMapReady.value = false;
  tileErrorMessage.value = "";
}

watch(
  () => geoapify.tileUrl.value,
  async (nextTileUrl) => {
    if (!nextTileUrl) {
      destroyMap();
      return;
    }

    if (!map) {
      await initializeMap();
      return;
    }

    syncTileLayer();
  },
);

watch(
  normalizedMarkers,
  () => {
    syncExternalMarkers();
  },
  { deep: true },
);

watch(
  selectedCoordinates,
  (nextCoordinates, previousCoordinates) => {
    const hasChanged = JSON.stringify(nextCoordinates) !== JSON.stringify(previousCoordinates);
    syncSelectedMarker({ recenter: hasChanged });
  },
  { deep: true },
);

watch(
  centerCoordinates,
  (nextCoordinates) => {
    syncCenterArtifacts();

    if (!selectedCoordinates.value && nextCoordinates) {
      setMapView(nextCoordinates, props.zoom);
    }
  },
  { deep: true },
);

watch(
  () => props.selectedMarkerDraggable,
  () => {
    syncSelectedMarker();
  },
);

onMounted(async () => {
  await initializeMap();
});

onBeforeUnmount(() => {
  destroyMap();
});
</script>

<template>
  <div class="leaflet-map-shell" :style="shellStyle">
    <div
      v-if="geoapify.isConfigured"
      ref="mapRootRef"
      class="leaflet-map-root"
      :class="{ 'leaflet-map-root--loading': !isMapReady }"
    />

    <div
      v-if="geoapify.isConfigured && tileErrorMessage"
      class="leaflet-map-error"
    >
      {{ tileErrorMessage }}
    </div>

    <div v-else class="leaflet-map-warning">
      <p class="leaflet-map-warning__title">Geoapify non configurato</p>
      <p class="leaflet-map-warning__text">
        Inserisci la chiave API per attivare mappa, autocomplete e reverse geocoding.
      </p>
    </div>
  </div>
</template>

<style scoped>
.leaflet-map-shell {
  position: relative;
  width: 100%;
  min-height: var(--leaflet-map-min-height, 320px);
  height: 100%;
}

.leaflet-map-root,
.leaflet-map-warning {
  width: 100%;
  min-height: var(--leaflet-map-min-height, 320px);
  height: 100%;
  border-radius: 1rem;
}

.leaflet-map-root {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 34px rgba(0, 0, 0, 0.24);
}

.leaflet-map-root--loading {
  opacity: 0.85;
}

.leaflet-map-warning {
  display: grid;
  place-content: center;
  gap: 0.55rem;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  background:
    radial-gradient(circle at top, rgba(255, 122, 24, 0.1), transparent 42%),
    linear-gradient(145deg, rgba(10, 14, 23, 0.94), rgba(6, 9, 15, 0.98));
  padding: 1.1rem;
  text-align: center;
}

.leaflet-map-error {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 500;
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 0.85rem;
  background: rgba(69, 10, 10, 0.92);
  color: rgba(254, 226, 226, 0.96);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.35;
  padding: 0.6rem 0.75rem;
}

.leaflet-map-warning__title {
  margin: 0;
  color: rgba(255, 245, 235, 0.98);
  font-size: 1rem;
  font-weight: 800;
}

.leaflet-map-warning__text {
  margin: 0;
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.88rem;
  line-height: 1.45;
}

:global(.app-leaflet-div-icon) {
  background: transparent;
  border: 0;
}

:global(.app-leaflet-selection-pin) {
  display: block;
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 245, 235, 0.95);
  border-radius: 999px;
  background:
    radial-gradient(circle at 35% 35%, rgba(255, 226, 204, 0.96) 0%, rgba(255, 157, 82, 0.95) 38%, rgba(255, 122, 24, 0.98) 100%);
  box-shadow:
    0 0 0 5px rgba(255, 122, 24, 0.22),
    0 12px 22px rgba(255, 122, 24, 0.35);
}

:global(.app-leaflet-center-dot) {
  display: block;
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.96);
  box-shadow:
    0 0 0 5px rgba(56, 189, 248, 0.22),
    0 10px 20px rgba(56, 189, 248, 0.28);
}

:global(.app-card-map-marker) {
  display: grid;
  justify-items: center;
  gap: 0.32rem;
}

:global(.app-card-map-marker__frame) {
  width: 46px;
  height: 64px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 0.7rem;
  background: rgba(15, 23, 42, 0.96);
  box-shadow:
    0 16px 26px rgba(0, 0, 0, 0.36),
    0 0 0 4px rgba(255, 122, 24, 0.14);
}

:global(.app-card-map-marker__image) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:global(.app-card-map-marker__price) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 214, 179, 0.35);
  background: rgba(8, 12, 20, 0.92);
  color: rgba(255, 236, 215, 0.96);
  font-size: 0.63rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  padding: 0.1rem 0.4rem;
}
</style>
