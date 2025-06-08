export async function fetchCardsFromApi() {
  try {
    await $fetch("/api/get-cards-list", {
      method: "GET",
    });
  } catch (error) {
    console.error("Errore scraping new:", error);
    throw new Error(error);
  }
}

export async function downloadCardsFromOfficialWebSite(infoSet) {
  try {
    const { jsonString, fileName } = await $fetch(
      "/api/get-cards-list-official",
      {
        method: "POST",
        body: infoSet,
      }
    );

    // 3. Crea un Blob e un URL temporaneo
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // 4. Crea un <a> e “cliccalo” per forzare il download
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a); // necessario per Firefox
    a.click();
    document.body.removeChild(a);

    // 5. Pulisci l’URL temporaneo
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Errore scraping from official:", error);
    throw new Error(error);
  }
}
