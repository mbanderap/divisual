<script setup lang="ts">
import { computed } from "vue";
import { CHANGELOG } from "../lib/changelog";
import { fdate } from "../lib/format";

const done = computed(() => CHANGELOG.filter((c) => c.status === "done"));
const planned = computed(() => CHANGELOG.filter((c) => c.status === "planned"));
</script>

<template>
  <div class="view-head">
    <div><h1>Changelog</h1><div class="view-sub">Lo que llevamos hecho y lo que queda por hacer</div></div>
  </div>

  <div class="dash-grid">
    <div class="card panel">
      <div class="panel-title">Hecho<span class="hint">{{ done.length }} entradas</span></div>
      <div v-for="c in done" :key="c.title" class="hist-item">
        <span class="h-date">{{ c.version ?? fdate(c.date) }}</span>
        <span class="h-note"><strong>{{ c.title }}</strong><br />{{ c.description }}</span>
      </div>
      <p v-if="!done.length" style="font-size: 12.5px; color: var(--faint)">Todavía no hay nada registrado.</p>
    </div>
    <div class="card panel">
      <div class="panel-title">Roadmap<span class="hint">{{ planned.length }} pendientes</span></div>
      <div v-for="c in planned" :key="c.title" class="hist-item">
        <span class="h-date"><span class="tag lead">Planeado</span></span>
        <span class="h-note"><strong>{{ c.title }}</strong><br />{{ c.description }}</span>
      </div>
      <p v-if="!planned.length" style="font-size: 12.5px; color: var(--faint)">Sin pendientes por ahora.</p>
    </div>
  </div>
</template>
