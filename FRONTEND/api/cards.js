import { useSnackbar } from "@/stores/useSnackbar";

export async function fetchActualCardsList() {
  const supabase = useSupabaseClient();
  const snackbar = useSnackbar();

  try {
    const all = [];
    let from = 0;
    const BATCH = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("cards")
        .select("card_id")
        .range(from, from + BATCH - 1);

      if (error) throw new Error(error.message);
      all.push(...data);

      if (data.length < BATCH) break;
      from += BATCH;
    }

    return new Set(all.map((c) => c.card_id));
  } catch (error) {
    snackbar.addMessage(
      "Errore nel recupero delle carte esistenti",
      "error",
      error.message ?? error
    );
    return new Set();
  }
}

export async function updateCardPrice(cardId, price) {
  const supabase = useSupabaseClient();
  const snackbar = useSnackbar();

  try {
    const { error } = await supabase
      .from("cards")
      .update({ cardtrader_avg_price: price })
      .eq("card_id", cardId);
    if (error) throw new Error(error.message);
  } catch (error) {
    snackbar.addMessage(
      `Errore nell'aggiornamento del prezzo per la carta ${cardId}`,
      "error",
      error.message ?? error
    );
  }
}

export async function bulkUpdateCardsList(newEntries) {
  const supabase = useSupabaseClient();
  const snackbar = useSnackbar();

  try {
    // dedup in base a card_id
    const seen = new Set();
    const uniqueEntries = newEntries.filter((e) => {
      if (seen.has(e.card_id)) return false;
      seen.add(e.card_id);
      return true;
    });

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
      "Errore durante il caricamento delle carte",
      "error",
      error.message ?? error
    );
  }
}

export async function fetchCardPrice(cardId) {
  const client = useSupabaseClient();
  const { data: cardInfo, error } = await client
    .from("cards")
    .select("*")
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  console.log('PREZZO A DB: ', cardInfo.cardtrader_avg_price);
  
  return cardInfo?.cardtrader_avg_price || null;
}
