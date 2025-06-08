import { useSnackbar } from "@/stores/useSnackbar";

export async function fetchActualCardsList() {
  const supabase = useSupabaseClient();
  const snackbar = useSnackbar();

  try {
    const all = [];
    let from = 0;
    const BATCH = 1000;

    // prendo 1000 righe per volta finché non ho finito
    while (true) {
      const { data, error } = await supabase
        .from("cards")
        .select("card_id, set_name")
        .range(from, from + BATCH - 1);

      if (error) throw new Error(error.message);
      all.push(...data);

      if (data.length < BATCH) break; // ho finito
      from += BATCH;
    }

    // costruisco il Set di chiavi composite JSON.stringify
    return new Set(
      all.map((c) =>
        JSON.stringify({ card_id: c.card_id, set_name: c.set_name })
      )
    );
  } catch (error) {
    snackbar.addMessage(
      "Errore nel recupero delle carte esistenti",
      "error",
      error.message ?? error
    );
    return new Set();
  }
}

export async function bulkUpdateCardsList(newEntries) {
  const supabase = useSupabaseClient();
  const snackbar = useSnackbar();

  console.log("bulkUpdateCardsList", newEntries);

  try {
    const uniqueEntries = Array.from(
      new Map(
        newEntries.map((e) => [
          JSON.stringify(e), // chiave unica
          e,
        ])
      ).values()
    );

    const { error: insertError } = await supabase
      .from("cards")
      .insert(uniqueEntries);

    if (insertError) throw new Error(insertError.message);

    snackbar.addMessage(
      "Caricamento completato",
      "success",
      `Caricate ${uniqueEntries.length} nuove carte.`
    );
  } catch (error) {
    snackbar.addMessage(
      "Errore durante il caricamento",
      "error",
      `${error.message ?? error}`
    );
  }
}
