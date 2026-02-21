<script setup>
import { computed } from "vue";
import { useSnackbar } from "@/stores/useSnackbar";

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    default: "info",
  },
  isFloating: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["close"]);
const snackbar = useSnackbar();

const typeTheme = computed(() => {
  switch (props.type) {
    case "success":
      return "snackbar-theme--success";
    case "error":
      return "snackbar-theme--error";
    case "warning":
      return "snackbar-theme--warning";
    default:
      return "snackbar-theme--info";
  }
});

function removeMessage() {
  snackbar.removeMessage(props.id);
  if (snackbar.lastMessageStored?.id === props.id) {
    snackbar.lastMessageStored = null;
  }
  emit("close", props.id);
}
</script>

<template>
  <transition name="snackbar-slide">
    <div class="snackbar-shell" :class="typeTheme">
      <v-btn v-if="isFloating" size="xs" variant="text" to="/logs" class="pa-0">
        <v-icon>mdi-information</v-icon>
      </v-btn>
      <div class="flex flex-col">
        <h3 class="font-medium text-[12px] text-white">{{ title }}</h3>
        <p v-if="message" class="font-italic break-all text-[11px] text-white">
          {{ message }}
        </p>
      </div>
      <v-spacer />
      <v-btn size="xs" variant="text" @click="removeMessage" class="close-button">
        <v-icon color="white">mdi-close</v-icon>
      </v-btn>
    </div>
  </transition>
</template>

<style scoped>
.snackbar-shell {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: 0.55rem 0.95rem;
  border-radius: 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #0b1220;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.72);
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 0.55rem;
  backdrop-filter: blur(14px);
}

.snackbar-shell h3,
.snackbar-shell p {
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.2;
  margin: 0;
}

.snackbar-shell p {
  font-style: normal;
}

.snackbar-shell .close-button {
  min-width: auto;
  padding: 0;
}

.snackbar-theme--success {
  background: linear-gradient(145deg, rgba(15, 55, 39, 0.96), rgba(5, 16, 9, 0.92));
  border-color: rgba(34, 197, 94, 0.32);
}

.snackbar-theme--error {
  background: linear-gradient(145deg, rgba(89, 24, 29, 0.96), rgba(14, 6, 9, 0.92));
  border-color: rgba(248, 113, 113, 0.32);
}

.snackbar-theme--warning {
  background: linear-gradient(145deg, rgba(96, 58, 15, 0.96), rgba(30, 17, 9, 0.92));
  border-color: rgba(251, 191, 36, 0.32);
}

.snackbar-theme--info {
  background: linear-gradient(145deg, rgba(12, 28, 62, 0.96), rgba(6, 10, 19, 0.92));
  border-color: rgba(96, 165, 250, 0.32);
}

.snackbar-slide-enter-from,
.snackbar-slide-leave-to {
  transform: translateY(-110%);
  opacity: 0;
}

.snackbar-slide-enter-to,
.snackbar-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.snackbar-slide-enter-active {
  transition: transform 0.33s ease, opacity 0.33s ease;
}

.snackbar-slide-leave-active {
  transition: transform 0.28s ease-in, opacity 0.28s ease-in;
}
</style>
