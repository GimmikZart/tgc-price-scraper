export function copyDeckOnClipboard(leader, cardsSetWithCount) {
  const lines = [];

  if (leader.code) {
    lines.push(`1x${leader.code}`);
  }

  cardsSetWithCount.forEach((card) => {
    lines.push(`${card.count}x${card.code}`);
  });

  const output = lines.join("\n");
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(output)
      .then(() => console.log("Deck copiato negli appunti!"))
      .catch((err) => console.error("Errore copia:", err));
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = output;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      console.log("Deck copiato negli appunti! (fallback)");
    } catch (err) {
      console.error("Errore copia fallback:", err);
    }
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}
