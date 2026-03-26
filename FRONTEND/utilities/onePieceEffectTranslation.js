function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[–—]/g, "−")
    .replace(/\u00A0/g, " ")
    .trim();
}

function pluralize(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/([.?])(?=[^\s\]\)•])/g, "$1 ")
    .replace(/!(?!!)(?=[^\s\]\)•])/g, "! ")
    .replace(/:(?=[^\s])/g, ": ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/DON!\s+!/g, "DON!!")
    .trim();
}

function restoreProtectedTokensFromEnglish(englishEffect, italianEffect) {
  const englishTokens = String(englishEffect ?? "").match(/(\[[^[\]]+\]|\{[^{}]+\})/g) || [];
  let tokenIndex = 0;

  return String(italianEffect ?? "").replace(/(\[[^[\]]+\]|\{[^{}]+\})/g, (match) => {
    const replacement = englishTokens[tokenIndex];
    tokenIndex += 1;
    return replacement ?? match;
  });
}

function translateDuration(value) {
  let text = String(value ?? "");

  const replacements = [
    [/ during this turn/gi, " durante questo turno"],
    [/ during this battle/gi, " durante questa battaglia"],
    [/ during your opponent's turn/gi, " durante il turno del tuo avversario"],
    [/ until the end of this turn/gi, " fino alla fine di questo turno"],
    [/ until the start of this turn/gi, " fino all'inizio di questo turno"],
    [/ until the start of your next turn/gi, " fino all'inizio del tuo prossimo turno"],
    [/ until the end of your next turn/gi, " fino alla fine del tuo prossimo turno"],
    [/ until the start of your opponent's next turn/gi, " fino all'inizio del prossimo turno del tuo avversario"],
    [/ until the end of your opponent's next turn/gi, " fino alla fine del prossimo turno del tuo avversario"],
    [/ until the end of your opponent's next End Phase/gi, " fino alla fine della prossima End Phase del tuo avversario"],
    [/ until the end of your next End Phase/gi, " fino alla fine della tua prossima End Phase"],
    [/ during the end of this turn/gi, " entro la fine di questo turno"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function canonicalizeRecipient(rawRecipient) {
  let recipient = normalizeWhitespace(rawRecipient)
    .replace(/^(?:to\s+|a\s+)/i, "");

  const exactReplacements = [
    [/^this Character$/i, "a questo Personaggio"],
    [/^this Leader$/i, "a questo Leader"],
    [/^your Leader$/i, "al tuo Leader"],
    [/^tuo Leader$/i, "al tuo Leader"],
    [/^1 of your Leader$/i, "a 1 dei tuoi Leader"],
    [/^1 dei tuoi Leader$/i, "a 1 dei tuoi Leader"],
    [/^your Leader or 1 of your Characters$/i, "al tuo Leader o a 1 dei tuoi Personaggi"],
    [/^tuo Leader o a 1 dei tuoi Personaggi$/i, "al tuo Leader o a 1 dei tuoi Personaggi"],
    [/^this Leader or 1 of your Characters$/i, "a questo Leader o a 1 dei tuoi Personaggi"],
    [/^its owner's Leader or 1 of their Characters$/i, "al Leader del suo proprietario o a 1 dei suoi Personaggi"],
    [/^1 dei tuoi Personaggi$/i, "a 1 dei tuoi Personaggi"],
    [/^1 delle tue carte Leader o Personaggio$/i, "a 1 delle tue carte Leader o Personaggio"],
  ];

  for (const [pattern, replacement] of exactReplacements) {
    if (pattern.test(recipient)) return replacement;
  }

  recipient = recipient
    .replace(/^1 of your (.+?) cards$/i, "a 1 delle tue carte $1")
    .replace(/^1 of your (.+?) Characters$/i, "a 1 dei tuoi Personaggi $1")
    .replace(/^1 of your (.+?) Leader or Character cards$/i, "a 1 delle tue carte Leader o Personaggio $1")
    .replace(/^your (.+?) Leader or Character cards$/i, "alle tue carte Leader o Personaggio $1")
    .replace(/^your (.+?) Leader$/i, "al tuo Leader $1")
    .replace(/^your (.+?) Characters$/i, "ai tuoi Personaggi $1")
    .replace(/^each of your (.+?) Characters$/i, "a ciascuno dei tuoi Personaggi $1")
    .replace(/^1 of your Characters$/i, "a 1 dei tuoi Personaggi")
    .replace(/^1 of your Leader or Character cards$/i, "a 1 delle tue carte Leader o Personaggio")
    .replace(/^your Leader or 1 of your Character cards$/i, "al tuo Leader o a 1 delle tue carte Personaggio")
    .replace(/^1 of your opponent's Characters$/i, "a 1 dei Personaggi del tuo avversario")
    .replace(/^1 of your opponent's Leader or Character cards$/i, "a 1 delle carte Leader o Personaggio del tuo avversario");

  const genericReplacements = [
    [/\byour opponent's\b/gi, "del tuo avversario"],
    [/\byour\b/gi, "tuo"],
    [/\btheir\b/gi, "loro"],
    [/\bCharacters\b/g, "Personaggi"],
    [/\bCharacter\b/g, "Personaggio"],
    [/\bLeader cards\b/gi, "carte Leader"],
    [/\bLeader or Character cards\b/gi, "carte Leader o Personaggio"],
    [/\bLeader or Character\b/gi, "Leader o Personaggio"],
    [/\bLeader\b/g, "Leader"],
    [/\brested DON!! cards\b/gi, "carte DON!! in stato spossato"],
    [/\brested DON!! card\b/gi, "carta DON!! in stato spossato"],
    [/\bcurrently given DON!! cards\b/gi, "carte DON!! attualmente assegnate"],
    [/\bcurrently given DON!! card\b/gi, "carta DON!! attualmente assegnata"],
    [/\bDON!! cards\b/gi, "carte DON!!"],
    [/\bDON!! card\b/gi, "carta DON!!"],
    [/\bactive\b/gi, "attivo"],
    [/\btype\b/gi, "di tipo"],
    [/\battribute\b/gi, "con attributo"],
  ];

  for (const [pattern, replacement] of genericReplacements) {
    recipient = recipient.replace(pattern, replacement);
  }

  recipient = recipient
    .replace(/^tuo /i, "al tuo ")
    .replace(/^tuoi /i, "ai tuoi ")
    .replace(/^tue /i, "alle tue ")
    .replace(/^del tuo avversario /i, "al tuo avversario ")
    .replace(/^dei tuoi /i, "a 1 dei tuoi ")
    .replace(/^delle tue /i, "a 1 delle tue ");

  if (!/^(?:a|al|ai|alla|alle)\b/i.test(recipient)) {
    recipient = `a ${recipient}`;
  }

  return normalizeWhitespace(recipient);
}

function canonicalizeOpponentModifierTarget(count, rawTarget) {
  const normalizedCount = Number(count);
  const target = normalizeWhitespace(rawTarget);

  if (/Leader or Character|Leader o Personaggio/i.test(target)) {
    return `a un massimo di ${normalizedCount} ${pluralize(normalizedCount, "carta", "carte")} Leader o Personaggio del tuo avversario`;
  }

  if (/Leader cards|Leader del tuo avversario/i.test(target)) {
    return `a un massimo di ${normalizedCount} ${pluralize(normalizedCount, "Leader", "Leader")} del tuo avversario`;
  }

  if (/＜[^＞]+＞ attribute Characters|attributo .* del tuo avversario/i.test(target)) {
    const attributeMatch = target.match(/(?:＜[^＞]+＞|<[^>]+>|attributo\s+.+?)(?=\s+(?:Characters|Character|Personaggi|Personaggio)|$)/i);
    const attribute = attributeMatch ? attributeMatch[0].replace(/^attributo\s+/i, "") : "";
    const noun = pluralize(normalizedCount, "Personaggio", "Personaggi");
    return `a un massimo di ${normalizedCount} ${noun}${attribute ? ` con attributo ${attribute}` : ""} del tuo avversario`;
  }

  return `a un massimo di ${normalizedCount} ${pluralize(normalizedCount, "Personaggio", "Personaggi")} del tuo avversario`;
}

function replaceStatModifierClauses(value) {
  let text = String(value ?? "");

  const modifierPatterns = [
    /(?:Give up to|give up to|[Cc]edi(?:re)?|[Cc]onsegna|[Rr]inuncia(?:re)?|[Dd]ai)\s+(?:(?:fino a|a|ad)\s+)?(?:un massimo di\s+)?(?<count>\d+)\s+(?<target>of your opponent's [^.\[\]:;]+?|dei personaggi del tuo avversario|dei Personaggi del tuo avversario|personaggi del tuo avversario|Personaggi del tuo avversario|delle carte Leader o Personaggio del tuo avversario|delle carte Leader o Personaggio|dei personaggi con attributo [^.\[\]:;]+? del tuo avversario|personaggio del tuo avversario|Personaggio del tuo avversario|carta Leader o Personaggio del tuo avversario)\s+(?:con un\s+)?(?:costo di|al costo di)?\s*(?<modifier>[+\-−]\d+)\s+(?<kind>cost|costo|power)(?<duration>\s+(?:during|durante|until|fino)[^.\[\]]*)?(?=[\.\[]|$)/gi,
    /(?:Give|give|[Dd]ai)\s+your\s+1\s+active\s+Leader\s+(?<modifier>[+\-−]\d+)\s+(?<kind>power|cost)(?<duration>\s+(?:during|durante|until|fino)[^.\[\]]*)?(?=[\.\[]|:|$)/gi,
  ];

  text = text.replace(modifierPatterns[0], (...args) => {
    const groups = args.at(-1);
    const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
    const kind = /cost|costo/i.test(groups.kind) ? "costo" : "power";
    const duration = translateDuration(groups.duration ?? "");
    const target = canonicalizeOpponentModifierTarget(groups.count, groups.target);
    return `Dai ${modifier} ${kind} ${target}${duration}`;
  });

  text = text.replace(modifierPatterns[1], (...args) => {
    const groups = args.at(-1);
    const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
    const kind = /cost|costo/i.test(groups.kind) ? "costo" : "power";
    const duration = translateDuration(groups.duration ?? "");
    return `Dai ${modifier} ${kind} al tuo Leader attivo${duration}`;
  });

  text = text.replace(
    /(?:cedere|Cedere|Cedi|cedi)\s+fino a\s+(?<count>\d+)\s+(?<target>personaggio del tuo avversario|Personaggio del tuo avversario|carta Leader o Personaggio del tuo avversario)\s+con un\s+(?<modifier>[+\-−]\d+)\s+(?<kind>costo|power)(?<duration>\s+durante[^.\[\]]*)?(?=[\.\[]|$)/g,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /costo/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      const target = canonicalizeOpponentModifierTarget(groups.count, groups.target);
      return `Dai ${modifier} ${kind} ${target}${duration}`;
    },
  );

  text = text.replace(
    /(?:Rinuncia|rinuncia)\s+(?:fino a\s+)?(?<count>\d+)\s+(?<target>personaggio del tuo avversario|Personaggio del tuo avversario|personaggi del tuo avversario|Personaggi del tuo avversario|carta Leader o Personaggio del tuo avversario|carte Leader o Personaggio del tuo avversario)\s+(?:a\s+un\s+|al\s+)?(?<modifier>[+\-−]\d+)\s+(?<kind>costo|power)(?<duration>\s+durante[^.\[\]]*)?(?=[\.\[]|$)/g,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /costo/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      const target = canonicalizeOpponentModifierTarget(groups.count, groups.target);
      return `Dai ${modifier} ${kind} ${target}${duration}`;
    },
  );

  text = text.replace(
    /(?:Cedere|cedere|Consegna|consegna|Rinuncia|rinuncia)\s+(?:fino a\s+|a\s+un\s+totale\s+di\s+)?(?<count>\d+)\s+(?<target>[^.\[\]]*?del tuo avversario)\s+(?:con un\s+costo\s+pari\s+a\s+|con un costo di\s+|con un\s+|a costo\s+|al costo\s+|al\s+|a\s+un\s+)?(?<modifier>[+\-−]\d+)\s+(?<kind>costo|power)(?<duration>\s+durante[^.\[\]]*)?(?=[\.\[]|$)/g,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /costo/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      const target = canonicalizeOpponentModifierTarget(groups.count, groups.target);
      return `Dai ${modifier} ${kind} ${target}${duration}`;
    },
  );

  text = text.replace(
    /(?:Give|give)\s+(?<target>blue Events in your hand|[^.\[\]:;]+?)\s+(?<modifier>[+\-−]\d+)\s+cost(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const target = normalizeWhitespace(groups.target)
        .replace(/blue Events in your hand/gi, "agli Eventi blu nella tua mano")
        .replace(/\bEvents\b/gi, "Eventi")
        .replace(/\bin your hand\b/gi, "nella tua mano");
      const normalizedTarget = /^(?:a|al|agli|alle)\b/i.test(target) ? target : `a ${target}`;
      return `Dai ${modifier} costo ${normalizedTarget}`;
    },
  );

  text = text.replace(
    /(?:Up to|up to|Fino a)\s+(?<count>\d+)\s+of your\s+(?<target>[^.\[\]:;]+?)\s+gains\s+(?<modifier>[+\-−]\d+)\s+(?<kind>power|cost)(?<duration>\s+(?:during|until)[^.\[\]]*)?(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /cost/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      const target = normalizeWhitespace(groups.target)
        .replace(/\bCharacters\b/g, "Personaggi")
        .replace(/\bCharacter\b/g, "Personaggio")
        .replace(/\bLeader or Character cards\b/gi, "carte Leader o Personaggio")
        .replace(/\bLeader\b/g, "Leader")
        .replace(/\btype\b/gi, "di tipo")
        .replace(/\bblack\b/gi, "nere")
        .replace(/\bred\b/gi, "rosse")
        .replace(/\bblue\b/gi, "blu")
        .replace(/\bgreen\b/gi, "verdi")
        .replace(/\byellow\b/gi, "gialle")
        .replace(/\bpurple\b/gi, "viola");

      return `Fino a ${count} ${/^(?:Leader|carte)/i.test(target) ? `delle tue ${target}` : `dei tuoi ${target}`} ${count === 1 ? "guadagna" : "guadagnano"} ${modifier} ${kind}${duration}`;
    },
  );

  text = text.replace(
    /(?:This Character gains|Questo Personaggio guadagna)\s+(?<modifier>[+\-−]\d+)\s+(?<kind>power|cost)(?<duration>\s+(?:during|until|durante|fino)[^.\[\]]*)?(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /cost/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      return `Questo Personaggio guadagna ${modifier} ${kind}${duration}`;
    },
  );

  text = text.replace(
    /(?:This Leader gains|Questo Leader guadagna)\s+(?<modifier>[+\-−]\d+)\s+(?<kind>power|cost)(?<duration>\s+(?:during|until|durante|fino)[^.\[\]]*)?(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const modifier = String(groups.modifier ?? "").replace(/-/g, "−");
      const kind = /cost/i.test(groups.kind) ? "costo" : "power";
      const duration = translateDuration(groups.duration ?? "");
      return `Questo Leader guadagna ${modifier} ${kind}${duration}`;
    },
  );

  return text;
}

function replaceDonAssignmentClauses(value) {
  let text = String(value ?? "");

  text = text.replace(
    /(?:Give this (?<recipientType>Character|Leader)\s+up to|dai a questo (?<recipientTypeIt>personaggio|leader)\s+fino a)\s+(?<count>\d+)\s+(?:rested\s+|in stato spossato\s+)?(?:DON!! cards?|carte DON!!|carta DON!!)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipientType = groups.recipientTypeIt
        ? (/leader/i.test(groups.recipientTypeIt) ? "Leader" : "Personaggio")
        : (/Leader/i.test(groups.recipientType) ? "Leader" : "Personaggio");
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! in stato spossato a questo ${recipientType}`;
    },
  );

  text = text.replace(
    /(?:Give up to|give up to|Regala fino a|Consegna fino a|Assegna fino a)\s+(?<count>\d+)\s+(?:rested\s+|in stato spossato\s+)?(?:DON!! cards?|carte DON!!|carta DON!!)\s+(?:to|a|al|alla|alle)\s+(?<recipient>[^.\[\]]+?)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipient = canonicalizeRecipient(groups.recipient);
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! in stato spossato ${recipient}`;
    },
  );

  text = text.replace(
    /(?:Regala fino a|Consegna fino a|Assegna fino a)\s+(?<count>\d+)\s+(?:DON!! cards?|carte DON!!|carta DON!!)\s+in stato spossato\s+(?:to|a|al|alla|alle)\s+(?<recipient>[^.\[\]]+?)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipient = canonicalizeRecipient(groups.recipient);
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! in stato spossato ${recipient}`;
    },
  );

  text = text.replace(
    /(?:Give up to|give up to|Assegna fino a)\s+(?<count>\d+)\s+total of your currently given\s+DON!! cards?\s+to\s+(?<recipient>[^.\[\]]+?)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipient = canonicalizeRecipient(groups.recipient);
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! tra quelle attualmente assegnate ${recipient}`;
    },
  );

  text = text.replace(
    /(?:Give up to|give up to|Assegna fino a)\s+(?<count>\d+)\s+of your currently given\s+(?:DON!! cards?|carte DON!!|carta DON!!)\s+to\s+(?<recipient>[^.\[\]]+?)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipient = canonicalizeRecipient(groups.recipient);
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! attualmente assegnate ${recipient}`;
    },
  );

  text = text.replace(
    /(?:Give up to|give up to)\s+(?<count>\d+)\s+of your opponent's rested\s+DON!! cards?\s+to\s+(?<recipient>[^.\[\]]+?)(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const recipient = canonicalizeRecipient(groups.recipient);
      return `Assegna fino a ${count} ${pluralize(count, "carta", "carte")} DON!! in stato spossato del tuo avversario ${recipient}`;
    },
  );

  text = text.replace(
    /(?:Give up to|give up to)\s+(?<count>\d+)\s+of your\s+(?<types>\{[^}]+\}(?: or \{[^}]+\})?\s+type)\s+Characters up to 1 rested DON!! card each(?=[\.\[]|$)/gi,
    (...args) => {
      const groups = args.at(-1);
      const count = Number(groups.count);
      const types = String(groups.types ?? "").replace(/\s+type/gi, "");
      return `Assegna fino a 1 carta DON!! in stato spossato ciascuno a un massimo di ${count} dei tuoi Personaggi ${types}`;
    },
  );

  return text;
}

function replaceEnglishLeftovers(value) {
  let text = String(value ?? "");

  const replacements = [
    [/\bYou may\b/g, "Puoi"],
    [/\bYou can\b/g, "Puoi"],
    [/\bIf your Leader has the\b/g, "Se il tuo Leader ha il"],
    [/\bIf your Leader's type includes\b/g, "Se il tipo del tuo Leader include"],
    [/\bIf your Leader is\b/g, "Se il tuo Leader è"],
    [/\bIf this Character was played on this turn\b/g, "Se questo Personaggio è stato giocato in questo turno"],
    [/\bIf you have\b/g, "Se hai"],
    [/\bIf the revealed card has the chosen cost\b/g, "Se la carta rivelata ha il costo scelto"],
    [/\bChoose one\b/g, "Scegli una delle opzioni"],
    [/\bChoose a cost\b/g, "Scegli un costo"],
    [/\bLook at (\d+) cards from the top of your deck\b/gi, "Guarda $1 carte dalla cima del tuo mazzo"],
    [/\bReveal (\d+) card from the top of your deck\b/gi, "Rivela $1 carta dalla cima del tuo mazzo"],
    [/\breveal up to\b/g, "rivela fino a"],
    [/\bReveal up to\b/g, "Rivela fino a"],
    [/\badd up to 1 DON!! card from your DON!! deck and rest it\b/gi, "aggiungi fino a 1 carta DON!! dal tuo mazzo DON!! e mettila in stato spossato"],
    [/\badd up to 1 DON!! card from your DON!! deck\b/gi, "aggiungi fino a 1 carta DON!! dal tuo mazzo DON!!"],
    [/\badd it to your hand\b/gi, "aggiungila alla tua mano"],
    [/\badd them to your hand\b/gi, "aggiungile alla tua mano"],
    [/\badd 1 card from the top of your Life cards to your hand\b/gi, "aggiungi 1 carta dalla cima delle tue carte Life alla tua mano"],
    [/\badd 1 card from your Life area to your hand\b/gi, "aggiungi 1 carta dalla tua area Life alla tua mano"],
    [/\bPlay up to\b/g, "Gioca fino a"],
    [/\bplay up to\b/g, "gioca fino a"],
    [/\bThen, play up to\b/g, "Poi, gioca fino a"],
    [/\bThen, add up to\b/g, "Poi, aggiungi fino a"],
    [/\bThen, add\b/g, "Poi, aggiungi"],
    [/\bThen, place the rest at the bottom of your deck in any order\b/gi, "Poi, metti il resto in fondo al tuo mazzo in qualsiasi ordine"],
    [/\bplace the rest at the bottom of your deck in any order\b/gi, "metti il resto in fondo al tuo mazzo in qualsiasi ordine"],
    [/\bplace 1 card from your hand at the top of your deck\b/gi, "metti 1 carta dalla tua mano in cima al tuo mazzo"],
    [/\bplace this Character at the bottom of the owner's deck\b/gi, "metti questo Personaggio in fondo al mazzo del proprietario"],
    [/\bplace this Stage at the bottom of the owner's deck\b/gi, "metti questa Stage in fondo al mazzo del proprietario"],
    [/\bplace this card and 1 card from your hand at the bottom of your deck in any order\b/gi, "metti questa carta e 1 carta dalla tua mano in fondo al tuo mazzo in qualsiasi ordine"],
    [/\bReturn up to\b/g, "Rimetti fino a"],
    [/\breturn 1 of your Characters to the owner's hand\b/gi, "rimetti 1 dei tuoi Personaggi in mano al proprietario"],
    [/\brest up to\b/g, "metti in stato spossato fino a"],
    [/\bRest up to\b/g, "Metti in stato spossato fino a"],
    [/\brest this Character\b/gi, "metti in stato spossato questo Personaggio"],
    [/\brest this Leader\b/gi, "metti in stato spossato questo Leader"],
    [/\brest this Stage\b/gi, "metti in stato spossato questa Stage"],
    [/\brest this card\b/gi, "metti in stato spossato questa carta"],
    [/\bRest 1 of your DON!! cards\b/gi, "Metti in stato spossato 1 delle tue carte DON!!"],
    [/\brest 1 of your DON!! cards\b/gi, "metti in stato spossato 1 delle tue carte DON!!"],
    [/\brest 2 of your DON!! cards\b/gi, "metti in stato spossato 2 delle tue carte DON!!"],
    [/\brest 5 of your DON!! cards\b/gi, "metti in stato spossato 5 delle tue carte DON!!"],
    [/\bRest 1 of your opponent's Characters\b/gi, "Metti in stato spossato 1 dei Personaggi del tuo avversario"],
    [/\bRest up to 1 of your opponent's Characters\b/gi, "Metti in stato spossato fino a 1 dei Personaggi del tuo avversario"],
    [/\bSet this Leader as active\b/gi, "Rendi attivo questo Leader"],
    [/\bset up to (\d+) of your DON!! cards as active\b/gi, "rendi attive fino a $1 delle tue carte DON!!"],
    [/\bSet up to (\d+) of your DON!! cards as active\b/gi, "Rendi attive fino a $1 delle tue carte DON!!"],
    [/\bset up to (\d+) of your ([^.\[\]]+?) as active\b/gi, "rendi attive fino a $1 delle tue $2"],
    [/\bSet up to (\d+) of your ([^.\[\]]+?) as active\b/gi, "Rendi attive fino a $1 delle tue $2"],
    [/\bDraw (\d+) cards?\b/gi, (_, count) => `Pesca ${count} ${Number(count) === 1 ? "carta" : "carte"}`],
    [/\bTrash up to (\d+) of your opponent's Life cards\b/gi, "Manda nel Trash fino a $1 delle carte Life del tuo avversario"],
    [/\btrash up to (\d+) cards from your hand\b/gi, "manda nel Trash fino a $1 carte dalla tua mano"],
    [/\btrash this Character\b/gi, "manda nel Trash questo Personaggio"],
    [/\btrash this card\b/gi, "manda nel Trash questa carta"],
    [/\bfrom your hand\b/gi, "dalla tua mano"],
    [/\bfrom your deck\b/gi, "dal tuo mazzo"],
    [/\bfrom your trash\b/gi, "dal tuo Trash"],
    [/\bfrom the top of your deck\b/gi, "dalla cima del tuo mazzo"],
    [/\bto your hand\b/gi, "alla tua mano"],
    [/\bto the owner's hand\b/gi, "in mano al proprietario"],
    [/\bto your DON!! deck\b/gi, "al tuo mazzo DON!!"],
    [/\bfrom your field\b/gi, "dal tuo campo"],
    [/\bat the bottom of their deck in any order\b/gi, "in fondo al loro mazzo in qualsiasi ordine"],
    [/\bat the bottom of your deck in any order\b/gi, "in fondo al tuo mazzo in qualsiasi ordine"],
    [/\bowner's deck\b/gi, "mazzo del proprietario"],
    [/\btheir trash\b/gi, "loro Trash"],
    [/\bLife cards\b/gi, "carte Life"],
    [/\bLife area\b/gi, "area Life"],
    [/\bface-up\b/gi, "scoperta"],
    [/\bCharacters\b/g, "Personaggi"],
    [/\bCharacter\b/g, "Personaggio"],
    [/\bLeader or Character cards\b/gi, "carte Leader o Personaggio"],
    [/\bLeader or Character\b/gi, "Leader o Personaggio"],
    [/\bLeader cards\b/gi, "carte Leader"],
    [/\bStage cards\b/gi, "carte Stage"],
    [/\bEvent\b/g, "Evento"],
    [/\bEvents\b/g, "Eventi"],
    [/\brested\b/gi, "in stato spossato"],
    [/\bactive\b/gi, "attivo"],
    [/\bbase cost\b/gi, "costo base"],
    [/\bbase power\b/gi, "power base"],
    [/\btype\b/gi, "tipo"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function replaceItalianArtifacts(value) {
  let text = String(value ?? "");

  const replacements = [
    [/\bTerreno\b/g, "campo"],
    [/\bterreno\b/g, "campo"],
    [/\bspazzatura\b/gi, "Trash"],
    [/\bPuoi Trash\b/gi, "Puoi mandare nel Trash"],
    [/\bTrash questo\b/gi, "Manda nel Trash questo"],
    [/\bTrash questa\b/gi, "Manda nel Trash questa"],
    [/\bTrash fino a\b/gi, "Manda nel Trash fino a"],
    [/\bTrash tutti\b/gi, "Manda nel Trash tutti"],
    [/\bTrash tutte\b/gi, "Manda nel Trash tutte"],
    [/\bTrash 1\b/gi, "Manda nel Trash 1"],
    [/\bTrash 2\b/gi, "Manda nel Trash 2"],
    [/\bTrash 3\b/gi, "Manda nel Trash 3"],
    [/\bTrash 4\b/gi, "Manda nel Trash 4"],
    [/\bTrash 5\b/gi, "Manda nel Trash 5"],
    [/mandare nel Manda nel Trash/gi, "mandare nel Trash"],
    [/Manda nel Manda nel Trash/gi, "Manda nel Trash"],
    [/\bPuoi Manda nel Trash\b/gi, "Puoi mandare nel Trash"],
    [/\bcarte DON!! dati\b/gi, "carte DON!! assegnate"],
    [/\bcarta DON!! dati\b/gi, "carta DON!! assegnata"],
    [/\bDON!! dati\b/gi, "DON!! assegnate"],
    [/\battualmente dati\b/gi, "attualmente assegnate"],
    [/\briceve un carta DON!!\b/gi, "riceve una carta DON!!"],
    [/\bK\. O\.\s*'d\b/gi, "K.O.'d"],
    [/\bK\. O\.\b/g, "K.O."],
    [/\bThen,\b/g, "Poi,"],
    [/\bPuoi metti\b/gi, "Puoi mettere"],
    [/\bPuoi far riposare\b/gi, "Puoi mettere in stato spossato"],
    [/\bpuoi far riposare\b/gi, "puoi mettere in stato spossato"],
    [/\bfar riposare\b/gi, "mettere in stato spossato"],
    [/\briposa\b/gi, "metti in stato spossato"],
    [/\briposare\b/gi, "mettere in stato spossato"],
    [/\briposato\b/gi, "in stato spossato"],
    [/\briposati\b/gi, "in stato spossato"],
    [/\bgiochi con un personaggio con \[Trigger\]/gi, "giochi un Personaggio con [Trigger]"],
    [/\bcaratteri di tipo\b/gi, "Personaggi di tipo"],
    [/\bLeader or Personaggio cards\b/gi, "carte Leader o Personaggio"],
    [/\bLeader or Personaggio\b/gi, "Leader o Personaggio"],
    [/\bdei tuoi personaggi diverso\b/gi, "dei tuoi Personaggi diversi"],
    [/\bI personaggi diversi dal tuo\b/gi, "I Personaggi diversi dal tuo"],
    [/\bdei tuoi carte\b/gi, "delle tue carte"],
    [/\bdei tuoi carta\b/gi, "della tua carta"],
    [/\bdei carte\b/gi, "delle carte"],
    [/\bdalla tua Trash\b/gi, "dal tuo Trash"],
    [/\bnella tua Trash\b/gi, "nel tuo Trash"],
    [/\bdella tua Trash\b/gi, "del tuo Trash"],
    [/\bManda nel Trash 1 card\b/gi, "Manda nel Trash 1 carta"],
    [/\bManda nel Trash 2 cards\b/gi, "Manda nel Trash 2 carte"],
    [/\bManda nel Trash 3 cards\b/gi, "Manda nel Trash 3 carte"],
    [/\bManda nel Trash 1 card from\b/gi, "Manda nel Trash 1 carta dalla"],
    [/\bManda nel Trash 2 cards from\b/gi, "Manda nel Trash 2 carte dalla"],
    [/\bcarte Life scoperta\b/gi, "carte Life scoperta"],
    [/\bpower base di (\d+) o meno\b/gi, "power base pari o inferiore a $1"],
    [/\bpower base di (\d+) o più\b/gi, "power base pari o superiore a $1"],
    [/\b(\d+) power base o meno\b/gi, "power base pari o inferiore a $1"],
    [/\b(\d+) power base o più\b/gi, "power base pari o superiore a $1"],
    [/\bun power base di (\d+) o meno\b/gi, "un power base pari o inferiore a $1"],
    [/\bun power base di (\d+) o più\b/gi, "un power base pari o superiore a $1"],
    [/\bcosto base of\b/gi, "costo base di"],
    [/\bcosto di ([+\-−]\d+)\b/gi, "$1 costo"],
    [/\bal costo di ([+\-−]\d+)\b/gi, "$1 costo"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

export function containsSuspiciousTranslationPatterns(value) {
  const text = normalizeText(value);
  if (!text) return true;

  const patterns = [
    /\b(?:You may|You can|This Character gains|This Leader gains|Give up to|Give this|Look at \d+|Draw \d+|Play up to|Rest up to|Return up to|Set up to|Choose one|If your Leader has|If your Leader is|If the revealed card|Trash up to|Reveal \d+)\b/i,
    /\b(?:Cedi|Cedere|Regala|Consegna|Rinuncia)\b/i,
    /\bcosto di [+\-−]\d+/i,
    /\bpower base\b/i,
    /\bDON!! dati\b/i,
    /\battualmente dati\b/i,
    /\briceve un carta\b/i,
    /\bManda nel Trash \d+ card\b/i,
    /\bThen,\b/,
    /\bfrom your\b/i,
    /\bto your\b/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export function refineOnePieceItalianEffectTranslation(englishEffect, italianEffect) {
  let text = normalizeText(italianEffect || englishEffect);

  if (!text) return null;

  text = replaceItalianArtifacts(text);
  text = replaceDonAssignmentClauses(text);
  text = replaceStatModifierClauses(text);
  text = replaceEnglishLeftovers(text);
  text = replaceItalianArtifacts(text);
  text = replaceDonAssignmentClauses(text);
  text = replaceStatModifierClauses(text);
  text = normalizeWhitespace(text);
  text = restoreProtectedTokensFromEnglish(englishEffect, text);

  return text || null;
}
