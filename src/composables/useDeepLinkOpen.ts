import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase";

/** Abre la ficha de un elemento ya cargado en memoria (catalogs.*) cuando la URL trae ?open=id. */
export function useDeepLinkOpen<T extends { id: number }>(items: () => T[], openEdit: (item: T) => void) {
  const route = useRoute();
  const router = useRouter();
  watch(
    [() => route.query.open, items],
    ([openId, list]) => {
      const id = Number(openId);
      if (!id || !list.length) return;
      const found = list.find((x) => x.id === id);
      if (found) openEdit(found);
      router.replace({ query: {} });
    },
    { immediate: true },
  );
}

/** Igual, pero para vistas paginadas: hace una consulta puntual por id en vez de mirar la página cargada. */
export function useDeepLinkFetch<T>(table: string, select: string, openEdit: (item: T) => void) {
  const route = useRoute();
  const router = useRouter();
  watch(
    () => route.query.open,
    async (openId) => {
      const id = Number(openId);
      if (!id) return;
      const { data } = await supabase.from(table).select(select).eq("id", id).single();
      if (data) openEdit(data as T);
      router.replace({ query: {} });
    },
    { immediate: true },
  );
}
