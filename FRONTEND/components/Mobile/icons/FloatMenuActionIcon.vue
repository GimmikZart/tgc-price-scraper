<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  icon: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const normalize = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u2192/g, "->");

const iconAliases = {
  "fluent:collections-add-24-regular": "collection-manage",
  "ph:swap": "manage",
  "mdi-check": "done",
  "el:ok": "done",
  "mdi:settings-off": "done",
  "solar:tag-price-outline": "price",
  "material-symbols:search-rounded": "filter",
  "material-symbols-light:book-ribbon": "album",
  "fluent:book-add-28-filled": "add",
  "material-symbols:cards": "deck-overview",
  "streamline:cards": "catalog",
  "mdi:cash-plus": "new-sale",
  "mdi:clipboard-clock-outline": "active-sales",
  "ion:stats-chart": "stats",
  "iconoir:wrench": "edit",
  "fluent:shifts-availability-24-regular": "collection-availability",
  "material-symbols:export-notes-outline": "export",
  "material-symbols:save-rounded": "save",
  "ic:baseline-cloud-done": "cloud-save",
  "material-symbols:save-as-outline": "save-draft",
  "tabler:trash": "delete",
  "hugeicons:file-remove": "remove",
  "streamline-ultimate:card-add-1-bold": "add",
  "fa-solid:plus": "add",
  "lucide:info": "info",
  "ri:import-fill": "import",
  "ri:run-line": "logout",
  "ic:baseline-settings": "settings",
  "mdi:pencil": "edit",
  "tabler:circle": "alerts",
  "mdi:show": "visibility",
  "mdi-sort-alphabetical-ascending": "sort-asc",
  "mdi-sort-alphabetical-descending": "sort-desc",
  "mdi-sort-numeric-ascending": "sort-asc",
  "mdi-sort-numeric-descending": "sort-desc",
  "mdi-sort": "sort",
};

const labelAliases = {
  gestisci: "manage",
  termina: "done",
  prezzi: "price",
  filtra: "filter",
  album: "album",
  "nuova vendita": "new-sale",
  "vendite in corso": "active-sales",
  panoramica: "deck-overview",
  catalogo: "catalog",
  stats: "stats",
  modifica: "edit",
  disponibilita: "collection-availability",
  esporta: "export",
  salva: "save",
  "salva nel cloud": "cloud-save",
  "salva bozza": "save-draft",
  cancella: "delete",
  aggiungi: "add",
  "aggiungi pagina": "add",
  rimuovi: "remove",
  "rimuovi pagina": "remove",
  info: "info",
  "al click": "settings",
  logout: "logout",
  opzioni: "settings",
  rinomina: "edit",
  avvisi: "alerts",
  "importa deck": "import",
  visibilita: "visibility",
  "a->z": "sort-asc",
  "z->a": "sort-desc",
  crescente: "sort-asc",
  decrescente: "sort-desc",
};

const resolvedIconName = computed(() => {
  const iconKey = normalize(props.icon);
  if (iconAliases[iconKey]) return iconAliases[iconKey];

  const labelKey = normalize(props.label);
  return labelAliases[labelKey] ?? null;
});

const fallbackIcon = computed(() => props.icon || "lucide:circle");
const strokeWidth = computed(() => (props.active ? 1.5 : 1));
</script>

<template>
  <svg
    v-if="resolvedIconName === 'manage'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <circle cx="9" cy="7" r="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
    <circle cx="15" cy="12" r="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
    <circle cx="7" cy="17" r="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'collection-manage'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4.3" y="6.2" width="9.8" height="12.4" rx="1.8" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect
      x="8.1"
      y="4.2"
      width="10.2"
      height="12.2"
      rx="1.8"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.1 : 0"
    />
    <circle
      cx="17.8"
      cy="16.8"
      r="3.5"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.14 : 0"
    />
    <path d="M17.8 15.2V18.4M16.2 16.8H19.4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'done'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
    <path d="M8.4 12.2L10.8 14.6L15.8 9.6" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'price'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M13.2 4.5L19.5 10.8L11.9 18.4H5.6V12.1L13.2 4.5Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
    <circle cx="14.8" cy="9.2" r="1.1" fill="currentColor" />
    <path d="M8.5 11.2H11.7M8.2 13H11.1M8.7 14.8H11.8" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'filter'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M4.5 6.2H19.5L14 12.5V18.2L10 20V12.5L4.5 6.2Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'album'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.4" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.08 : 0" />
    <path d="M9 4.5V19.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <rect x="11.7" y="8.4" width="5" height="3" rx="0.8" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.15 : 0" />
    <rect x="11.7" y="13.1" width="5" height="2.6" rx="0.8" stroke="currentColor" :stroke-width="strokeWidth" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'deck-overview'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4.3"
      y="5.2"
      width="8.8"
      height="11.4"
      rx="1.6"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <rect x="6.3" y="8.1" width="4.8" height="1.5" rx="0.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="6.3" y="11.1" width="4.8" height="1.5" rx="0.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="14.2" y="5.8" width="5.5" height="1.6" rx="0.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="14.2" y="9" width="5.5" height="1.6" rx="0.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="14.2" y="12.2" width="5.5" height="1.6" rx="0.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <path d="M5.1 19.4H18.9" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'catalog'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4.3"
      y="4.7"
      width="15.4"
      height="14.8"
      rx="2.2"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <rect x="7" y="7.4" width="3.7" height="3.7" rx="0.9" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="13.3" y="7.4" width="3.7" height="3.7" rx="0.9" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="7" y="13.2" width="3.7" height="3.7" rx="0.9" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="13.3" y="13.2" width="3.7" height="3.7" rx="0.9" stroke="currentColor" :stroke-width="strokeWidth" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'cards'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="5.2" y="6.2" width="11" height="13.6" rx="2" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="8.8" y="4.2" width="10" height="13.2" rx="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
    <path d="M10.8 8.5H16.6" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'new-sale'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4.8 7.1H12L16.8 11.9L10.6 18.1H4.8V7.1Z"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <circle cx="10.2" cy="10.5" r="1.1" fill="currentColor" />
    <path d="M12.4 9.4L14.4 11.4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <circle
      cx="17.1"
      cy="16.7"
      r="3.2"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.14 : 0"
    />
    <path d="M17.1 15.2V18.2M15.6 16.7H18.6" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'active-sales'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4.9"
      y="5.2"
      width="10.8"
      height="13.8"
      rx="2"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <rect x="8.3" y="3.8" width="4" height="2.3" rx="0.9" stroke="currentColor" :stroke-width="strokeWidth" />
    <path d="M8 9.5H12.6M8 12H11.7" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <circle
      cx="17.1"
      cy="15.8"
      r="3.5"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.14 : 0"
    />
    <path d="M17.1 14.1V15.9L18.4 16.8" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'stats'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M4.5 19.5H19.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <rect x="6.1" y="12.3" width="2.6" height="6.2" rx="0.6" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.16 : 0" />
    <rect x="10.7" y="9.3" width="2.6" height="9.2" rx="0.6" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.16 : 0" />
    <rect x="15.3" y="6.8" width="2.6" height="11.7" rx="0.6" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.16 : 0" />
    <path d="M6.4 9.3L10.5 7.1L13 8.8L17.4 5.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'edit'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M5.2 18.8L8.9 18L17.9 9L15 6.1L6 15.1L5.2 18.8Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
    <path d="M13.9 7.2L16.8 10.1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'collection-availability'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4.3" y="6.1" width="8.7" height="11.7" rx="1.7" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect
      x="7.8"
      y="4.3"
      width="8.9"
      height="11.2"
      rx="1.7"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :fill="active ? 'currentColor' : 'none'"
      :fill-opacity="active ? 0.08 : 0"
    />
    <circle cx="16.8" cy="16.8" r="3.2" stroke="currentColor" :stroke-width="strokeWidth" />
    <path d="M15.4 16.8H18.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <path d="M10 10.3H13.9" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'export'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4.5" y="7.8" width="15" height="11.7" rx="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.08 : 0" />
    <path d="M12 4.2V13.2M12 4.2L8.8 7.4M12 4.2L15.2 7.4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'import'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="4.5" y="4.5" width="15" height="11.7" rx="2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.08 : 0" />
    <path d="M12 19.8V10.8M12 19.8L8.8 16.6M12 19.8L15.2 16.6" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'save'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M5.2 4.5H16.8L19.5 7.2V19.5H5.2V4.5Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.09 : 0" />
    <rect x="7.7" y="5.8" width="7.2" height="4" rx="0.8" stroke="currentColor" :stroke-width="strokeWidth" />
    <rect x="8.2" y="13.2" width="7.6" height="4.6" rx="1" stroke="currentColor" :stroke-width="strokeWidth" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'cloud-save'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7.3 17.8H16.9C19 17.8 20.6 16.3 20.6 14.4C20.6 12.5 19 11 17 11H16.6C16 8.6 13.9 7 11.4 7C8.4 7 6.1 9.4 6.1 12.4V12.5C4.8 12.9 3.9 14 3.9 15.4C3.9 16.7 4.8 17.8 7.3 17.8Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.1 : 0" />
    <path d="M12 10.6V15.1M12 15.1L9.9 13M12 15.1L14.1 13" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'save-draft'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7 3.8H14.6L18.7 7.9V20.2H7V3.8Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.1 : 0" />
    <path d="M14.6 3.9V7.9H18.6" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" />
    <path d="M10.1 13.2H15.6M10.1 16.1H14.1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'delete'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M4.8 7.2H19.2M9.4 7.2V5.4H14.6V7.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <rect x="6.7" y="7.2" width="10.6" height="12.2" rx="1.7" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.1 : 0" />
    <path d="M10.1 10.5V16.1M13.9 10.5V16.1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'add'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
    <path d="M12 8.3V15.7M8.3 12H15.7" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'remove'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.14 : 0" />
    <path d="M8.3 12H15.7" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'info'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.2" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
    <path d="M12 10.8V15.3" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <circle cx="12" cy="7.7" r="1" fill="currentColor" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'logout'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M9.2 4.8H6.8C5.7 4.8 4.8 5.7 4.8 6.8V17.2C4.8 18.3 5.7 19.2 6.8 19.2H9.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <path d="M13.2 8.1L17.3 12L13.2 15.9" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8.8 12H17" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'settings'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="2.9" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.2 : 0" />
    <path d="M12 5.2V3.9M12 20.1V18.8M7.2 7.2L6.2 6.2M17.8 17.8L16.8 16.8M5.2 12H3.9M20.1 12H18.8M7.2 16.8L6.2 17.8M17.8 6.2L16.8 7.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    <circle cx="12" cy="12" r="6.3" stroke="currentColor" :stroke-width="strokeWidth" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'alerts'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7.4 9.4C7.4 6.9 9.5 4.9 12 4.9C14.5 4.9 16.6 6.9 16.6 9.4V13.2L18.1 15.7H5.9L7.4 13.2V9.4Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.12 : 0" />
    <path d="M10.1 17.2C10.5 18.2 11.1 18.7 12 18.7C12.9 18.7 13.5 18.2 13.9 17.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'visibility'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M3.8 12C5.6 8.6 8.5 6.8 12 6.8C15.5 6.8 18.4 8.6 20.2 12C18.4 15.4 15.5 17.2 12 17.2C8.5 17.2 5.6 15.4 3.8 12Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.1 : 0" />
    <circle cx="12" cy="12" r="2.3" stroke="currentColor" :stroke-width="strokeWidth" :fill="active ? 'currentColor' : 'none'" :fill-opacity="active ? 0.2 : 0" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'sort-asc'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M6.2 18.8V6.1M6.2 6.1L4.2 8.2M6.2 6.1L8.2 8.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M11.4 8.8H19.3M11.4 12H17.2M11.4 15.2H15.1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'sort-desc'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M6.2 5.2V17.9M6.2 17.9L4.2 15.8M6.2 17.9L8.2 15.8" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M11.4 8.8H15.1M11.4 12H17.2M11.4 15.2H19.3" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="resolvedIconName === 'sort'"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M7 6.2V17.8M7 6.2L4.9 8.3M7 6.2L9.1 8.3M17 17.8V6.2M17 17.8L14.9 15.7M17 17.8L19.1 15.7" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <Icon
    v-else
    :icon="fallbackIcon"
    class="h-full w-full"
    aria-hidden="true"
  />
</template>
