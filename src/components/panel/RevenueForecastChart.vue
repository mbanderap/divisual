<script setup lang="ts">
import { computed, ref } from "vue";
import { eur } from "../../lib/format";

const props = defineProps<{ months: { key: string; label: string; total: number }[] }>();

const showTable = ref(false);
const hovered = ref<number | null>(null);

// Escala: máximo redondeado hacia arriba a una cifra "limpia" (…10, 20, 50, 100k…)
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = raw / pow;
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10;
  return nice * pow;
}
const maxVal = computed(() => niceMax(Math.max(...props.months.map((m) => m.total), 1)));

const W = 720;
const H = 200;
const PAD_L = 46;
const PAD_B = 22;
const PAD_T = 10;
const chartW = W - PAD_L;
const chartH = H - PAD_B - PAD_T;
const gap = 6;
const barW = computed(() => Math.min(24, chartW / props.months.length - gap));

function barX(i: number): number {
  const slot = chartW / props.months.length;
  return PAD_L + i * slot + (slot - barW.value) / 2;
}
function barHeight(total: number): number {
  return maxVal.value ? (total / maxVal.value) * chartH : 0;
}
function barPath(i: number, total: number): string {
  const x = barX(i);
  const w = barW.value;
  const h = Math.max(barHeight(total), 1);
  const y = PAD_T + chartH - h;
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}
const ticks = computed(() => [0, 0.5, 1].map((f) => ({ y: PAD_T + chartH * (1 - f), value: maxVal.value * f })));

function onEnter(i: number, e: MouseEvent) {
  hovered.value = i;
  const wrap = (e.currentTarget as SVGElement).closest(".rfc-wrap") as HTMLElement;
  const rect = wrap.getBoundingClientRect();
  tooltipPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
const tooltipPos = ref({ x: 0, y: 0 });
</script>

<template>
  <div class="rfc-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" class="rfc-svg" role="img" aria-label="Previsión de ingresos por mes">
      <line v-for="t in ticks" :key="t.y" :x1="PAD_L" :x2="W" :y1="t.y" :y2="t.y" class="rfc-grid" />
      <text v-for="t in ticks" :key="'l' + t.y" :x="PAD_L - 8" :y="t.y" class="rfc-tick" text-anchor="end" dominant-baseline="middle">{{ eur(t.value) }}</text>
      <g v-for="(m, i) in months" :key="m.key">
        <path
          :d="barPath(i, m.total)"
          class="rfc-bar"
          :class="{ hovered: hovered === i }"
          tabindex="0"
          :aria-label="`${m.label}: ${eur(m.total)}`"
          @mouseenter="onEnter(i, $event)"
          @mouseleave="hovered = null"
          @focus="hovered = i"
          @blur="hovered = null"
        />
        <text :x="barX(i) + barW / 2" :y="H - 4" class="rfc-tick" text-anchor="middle">{{ m.label }}</text>
      </g>
    </svg>
    <div v-if="hovered != null" class="rfc-tooltip" :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
      <strong>{{ eur(months[hovered].total) }}</strong>
      <span>{{ months[hovered].label }}</span>
    </div>
    <button type="button" class="rfc-table-toggle" @click="showTable = !showTable">{{ showTable ? "Ver gráfico" : "Ver tabla" }}</button>
    <div v-if="showTable" class="table-wrap" style="margin-top: 10px">
      <table>
        <thead><tr><th>Mes</th><th>Ingresos</th></tr></thead>
        <tbody>
          <tr v-for="m in months" :key="m.key"><td>{{ m.label }}</td><td class="num">{{ eur(m.total) }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
