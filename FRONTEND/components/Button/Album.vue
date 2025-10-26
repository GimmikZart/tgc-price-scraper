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
    :class="{ 'cursor-pointer': !disabled, 'opacity-50': disabled }"
    @click="handleClick"
  >
    <h5
      class="album-title mt-5 z-10 text-xl md:text-3xl font-extrabold tracking-wide text-center px-6"
      :class="{ 'opacity-70': disabled }"
    >
      {{ label }}
    </h5>
    <!-- opzionale: piccolo “segnalibro” sul dorso -->
    <span class="album-tab" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
/* ---- palette variabile (puoi cambiarla per altri colori di pelle) ---- */
.album-card{
  /* cuoio marrone caldo */
  --leather: #3f2a1c;
  --leather-hi: #5a3a27;
  --leather-lo: #2a1b12;
  --edge: #2b1d14;
  --stitch: #e9d6b8;
  --shine: rgba(255,255,255,.12);

  position: relative;
  border-radius: 1rem;          /* match con rounded-2xl */
  /* base: volume + leggero bevel */
  box-shadow:
    0 10px 18px rgba(0,0,0,.45),
    inset 0 2px 0 rgba(255,255,255,.08),
    inset 0 -3px 8px rgba(0,0,0,.55);

  /* fondo “cuoio”: sfumatura + vignettatura + riflesso diagonale */
  background:
    /* riflesso diagonale morbido */
    linear-gradient(135deg, transparent 30%, var(--shine) 60%, transparent 70%) ,
    /* vignetta */
    radial-gradient(120% 90% at 50% 30%, transparent 50%, rgba(0,0,0,.35) 100%),
    /* tono principale */
    linear-gradient(180deg, var(--leather-hi), var(--leather-lo));
  background-blend-mode: overlay, normal, normal;
}

/* grana del cuoio: due layer “puntinati” sovrapposti */
.album-card::before{
  content:"";
  position:absolute; inset:0;
  pointer-events:none;
  border-radius: inherit;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,.04) 0 1px, transparent 1px) 0 0/4px 4px,
    radial-gradient(circle at 70% 60%, rgba(0,0,0,.06) 0 1px, transparent 1px) 0 0/3px 3px;
  mix-blend-mode: overlay;
  opacity:.8;
}

/* bordo scurito + “taglio” laterale per sembrare un dorso */
.album-card::after{
  content:"";
  position:absolute; inset:0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 2px rgba(0,0,0,.35),
    inset 0 0 35px rgba(0,0,0,.45);
}

/* cuciture: quattro lati a trattini, con raggio rispettato */
.album-card {
  --pad: 10px;               /* distanza cucitura dal bordo */
}

/* anello di cucitura (usiamo un wrapper invisibile via outline + masks) */
.album-card::marker{display:none}
.album-card > .stitches{display:none} /* solo per chiarezza */

.album-card:before,
.album-card:after{pointer-events:none}

.album-card {
  /* “stitches” con 4 background, rispettando i corner */
  background-image:
    /* top */
    linear-gradient(to right, var(--stitch) 50%, transparent 0),
    /* bottom */
    linear-gradient(to right, var(--stitch) 50%, transparent 0),
    /* left */
    linear-gradient(to bottom, var(--stitch) 50%, transparent 0),
    /* right */
    linear-gradient(to bottom, var(--stitch) 50%, transparent 0),
    /* resto già dichiarato sopra (gradients cuoio) */ 
    linear-gradient(135deg, transparent 30%, var(--shine) 60%, transparent 70%),
    radial-gradient(120% 90% at 50% 30%, transparent 50%, rgba(0,0,0,.35) 100%),
    linear-gradient(180deg, var(--leather-hi), var(--leather-lo));
  background-repeat:
    repeat-x, repeat-x, repeat-y, repeat-y, no-repeat, no-repeat, no-repeat;
  background-size:
    8px 2px,                  /* top: dash */
    8px 2px,                  /* bottom */
    2px 8px,                  /* left */
    2px 8px,                  /* right */
    auto, auto, auto;
  background-position:
    calc(var(--pad)) calc(var(--pad)),                     /* top */
    calc(var(--pad)) calc(100% - var(--pad)),              /* bottom */
    calc(var(--pad)) calc(var(--pad)),                     /* left */
    calc(100% - var(--pad)) calc(var(--pad)),              /* right */
    0 0, 0 0, 0 0;
}

/* linguetta tipo “segnalibro” sul dorso */
.album-tab{
  position:absolute;
  left: 0px; top: 0%;
  width: 10px; height: 100%;
  border-radius: 6px;
  background: linear-gradient(180deg, #6b4731, #925f3d);
  box-shadow: inset 0 1px 0 rgba(119, 29, 29, 0.15), inset 0 -2px 4px rgba(209, 13, 13, 0.5);
}

/* micro-interazioni */
.album-card:active{ transform: translateY(1px) scale(.995); }
.album-card:hover{ filter: saturate(1.05) brightness(1.03); }
</style>
