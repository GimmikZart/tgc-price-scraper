<script setup>
const router = useRouter();
const props = defineProps({
  image: { type: String, required: false },
  to: { type: String, default: "/" },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: "Button" },
});

function handleClick() {
  if (!props.disabled) router.push(props.to);
}
</script>

<template>
  <div
    class="album-card relative aspect-[2/3] rounded-2xl overflow-hidden select-none"
    :class="{ 'cursor-pointer': !disabled, 'opacity-55': disabled }"
    @click="handleClick"
  >
    <span class="album-spine" aria-hidden="true"></span>
    <span class="album-strap" aria-hidden="true"></span>
    <span class="album-inner-edge" aria-hidden="true"></span>

    <div class="album-title-wrap">
      <h5 class="album-title" :class="{ 'opacity-75': disabled }">{{ label }}</h5>
      <span class="album-title-rule" aria-hidden="true"></span>
    </div>
  </div>
</template>

<style scoped>
.album-card {
  --cover-top: #1f2738;
  --cover-mid: #151d2c;
  --cover-low: #0e1420;
  --cover-edge: #0a0f17;
  --foil-light: #f0f3fb;
  --foil-mid: #b9c3d8;
  --foil-deep: #74839f;
  --strap-light: #7d61cb;
  --strap-mid: #5f459f;
  --strap-deep: #3f2f69;

  position: relative;
  border-radius: 1rem;
  isolation: isolate;
  transform-origin: center;
  transition: transform 180ms ease, filter 180ms ease;

  background:
    radial-gradient(145% 90% at 50% 6%, rgba(247, 252, 255, 0.13) 0%, rgba(247, 252, 255, 0) 35%),
    linear-gradient(100deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 15%),
    linear-gradient(180deg, var(--cover-top) 0%, var(--cover-mid) 48%, var(--cover-low) 100%);

  box-shadow:
    0 16px 28px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -14px 26px rgba(0, 0, 0, 0.46),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.album-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.25;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E");
}

.album-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 0 0 2px rgba(0, 0, 0, 0.2);
}

.album-spine {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 11%;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.26) 55%, rgba(255, 255, 255, 0.06) 100%),
    linear-gradient(180deg, #141a26 0%, #0c111a 100%);
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, 0.11),
    inset 1px 0 0 rgba(0, 0, 0, 0.5);
}

.album-strap {
  position: absolute;
  top: 0;
  right: 10%;
  width: 5.5%;
  height: 100%;
  pointer-events: none;
  opacity: 0.88;
  background: linear-gradient(180deg, var(--strap-light) 0%, var(--strap-mid) 45%, var(--strap-deep) 100%);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.23),
    inset -1px 0 0 rgba(0, 0, 0, 0.5),
    0 0 12px rgba(63, 47, 105, 0.35);
}

.album-inner-edge {
  position: absolute;
  inset: 10px;
  border-radius: 0.8rem;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.24),
    inset 0 0 24px rgba(0, 0, 0, 0.32);
}

.album-title-wrap {
  position: absolute;
  top: 16%;
  left: 21%;
  right: 18%;
  display: grid;
  gap: 0.45rem;
  text-align: center;
  padding: 0.46rem 0.52rem 0.52rem;
  border-radius: 0.42rem;
  background:
    linear-gradient(180deg, rgba(32, 41, 58, 0.86) 0%, rgba(13, 20, 31, 0.94) 100%);
  border: 1px solid rgba(205, 218, 244, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -6px 8px rgba(0, 0, 0, 0.34),
    0 6px 12px rgba(0, 0, 0, 0.36);
}

.album-title-wrap::before {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 0.3rem;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(189, 201, 226, 0.2) 0,
    rgba(189, 201, 226, 0.2) 1px,
    rgba(189, 201, 226, 0) 1px,
    rgba(189, 201, 226, 0) 4px
  );
  opacity: 0.36;
}

.album-title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: clamp(0.5rem, 0.4rem + 0.66vw, 1.02rem);
  line-height: 1.18;
  letter-spacing: 0.065em;
  text-transform: uppercase;
  font-weight: 900;

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  text-wrap: balance;

  color: transparent;
  background: linear-gradient(180deg, var(--foil-light) 0%, var(--foil-mid) 46%, var(--foil-deep) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 1px 0 rgba(249, 252, 255, 0.28), 0 8px 10px rgba(0, 0, 0, 0.36);
}

.album-title-rule {
  position: relative;
  z-index: 1;
  width: 78%;
  height: 2px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent 0%, rgba(226, 234, 249, 0.92) 50%, transparent 100%);
  box-shadow: 0 0 8px rgba(188, 201, 229, 0.48);
}

.album-card:hover {
  transform: translateY(-1px) scale(1.008);
  filter: contrast(1.04) saturate(1.04);
}

.album-card:active {
  transform: translateY(1px) scale(0.995);
}
</style>
