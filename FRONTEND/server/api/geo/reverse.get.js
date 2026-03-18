import { reverseGeoapify } from "~/server/utils/geoapify";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const latitude = Number(query.lat);
  const longitude = Number(query.lng ?? query.lon);

  const result = await reverseGeoapify(latitude, longitude);
  return { result };
});
