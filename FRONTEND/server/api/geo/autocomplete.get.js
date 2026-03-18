import { autocompleteGeoapify } from "~/server/utils/geoapify";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const text = String(query.text ?? "").trim();
  const limit = Number(query.limit);

  if (!text) {
    return { results: [] };
  }

  const results = await autocompleteGeoapify(text, { limit });
  return { results };
});
