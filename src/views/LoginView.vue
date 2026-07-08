<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import LogoWordmark from "../components/brand/LogoWordmark.vue";

const auth = useAuthStore();
const theme = useThemeStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function onSubmit() {
  errorMsg.value = "";
  loading.value = true;
  try {
    await auth.signIn(email.value.trim(), password.value);
    router.push({ name: "panel" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errorMsg.value = msg === "Invalid login credentials"
      ? "Credenciales incorrectas. Revisa el correo y la contraseña."
      : "No se pudo iniciar sesión: " + msg;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-wrap">
    <button class="icon-btn auth-theme" title="Cambiar tema" @click="theme.toggle()">
      <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.7">
        <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z" />
      </svg>
    </button>

    <div class="auth-card" v-if="!auth.configured">
      <div class="auth-brand"><LogoWordmark /></div>
      <p class="auth-sub">
        Falta la configuración de Supabase. Define las variables de entorno
        <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en tu proyecto de Vercel
        (Settings → Environment Variables) o en un archivo <code>.env</code> local, y vuelve a desplegar.
      </p>
      <p class="auth-foot">Encuentras ambos valores en Supabase, en Project Settings, sección API.</p>
    </div>

    <div class="auth-card" v-else>
      <div class="auth-brand"><LogoWordmark /></div>
      <p class="auth-sub">Inicia sesión con tu cuenta de equipo para acceder al CRM.</p>
      <div class="auth-err" v-if="errorMsg">{{ errorMsg }}</div>
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label for="liEmail">Correo electrónico</label>
          <input id="liEmail" v-model="email" type="email" autocomplete="email" placeholder="tu@empresa.com" required />
        </div>
        <div class="field">
          <label for="liPass">Contraseña</label>
          <input id="liPass" v-model="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required />
        </div>
        <button class="btn btn-primary btn-block" type="submit" :disabled="loading">
          {{ loading ? "Entrando..." : "Entrar" }}
        </button>
      </form>
      <p class="auth-foot">
        Las cuentas las crea un administrador en Supabase (Authentication, Users, Add user).
        Si no tienes acceso, pídeselo a tu equipo.
      </p>
    </div>
  </div>
</template>
