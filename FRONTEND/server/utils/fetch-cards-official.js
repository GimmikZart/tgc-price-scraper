import { broadcastEvent } from '../api/scrape-stream'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

/**
 * Scrapes a list of cards from the target site following the specified flow:
 *
 * 1. Navigate to `url`.
 * 2. Click the series‐selection button.
 * 3. In the modal, find and click the <li> whose text contains `expansionName`.
 * 4. Submit the search form.
 * 5. Click the first card in the results.
 * 6. Loop `numIterations` times:
 *    a. Wait for the fancybox slide to load.
 *    b. Extract all fields (name, code, rarity, etc.) from the current card popup.
 *    c. Push the card object into an array.
 *    d. Click the “next” arrow to advance to the next card.
 * 7. Close the browser and return the array of card objects.
 *
 * @param {Object} params
 * @param {string} params.url            — L’URL di partenza su cui fare scraping.
 * @param {string} params.expansionName  — Testo (o parte di testo) che identifica l’espansione da selezionare.
 * @param {number} params.numIterations  — Quante carte (fancybox slides) vuoi estrarre in totale.
 *
 * @returns {Promise<Array<Object>>} Una Promise che risolve in un array di oggetti “carta”.
 */
export default async function scrapeCardsOfficial(/* { url, expansionName, numIterations } */) {

  const url = "https://en.onepiece-cardgame.com/cardlist/"
  const expansionName = "-ROMANCE DAWN- [OP-01]"
  const numIterations = 154

  broadcastEvent('generic_info', `Scraping iniziato per ${expansionName}` )

  const startTime = Date.now()
  const ramStart  = process.memoryUsage().heapUsed / 1024 / 1024

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  })
  const page = await browser.newPage()

  // ➊ Imposto un viewport desktop “ampio”
  await page.setViewport({ width: 1280, height: 800 })

  // ➋ (Opzionale) Cambio la userAgent in qualcosa di più “desktop”
  //     così evito che il sito rilevi automaticamente il mobile
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/114.0.0.0 Safari/537.36'
  await page.setUserAgent(desktopUA)

  //page.setDefaultTimeout(20000) // 20 secondi di timeout su waitForSelector

  try {
    // 1) Naviga all’URL
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    if (page.isClosed()) {
      throw new Error('La pagina si è chiusa dopo il goto')
    }

    try {
      const cookieBtn = await page.$('#onetrust-accept-btn-handler')
      if (cookieBtn) {
        await cookieBtn.click()
        // Breve delay per lasciare sparire il banner
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch {
      broadcastEvent('generic_error', 'Impossibile cliccare il pulsante dei cookie. Potrebbe essere già accettato o non presente.')
    }    

    // 2) Clicca su "#frmSearch > div.formsetDefaultArea > div.seriesCol > button"
    await page.waitForSelector('#frmSearch > div.formsetDefaultArea > div.seriesCol > button', { visible: true })
    await page.click('#frmSearch > div.formsetDefaultArea > div.seriesCol > button')

    await wait(2000) // Attendo due secondi per sicurezza


    // 3) Attendi i <li> dentro il modal generico .selModal (non #cardlist)
    let modalItems = []
    try {
      await page.waitForSelector(
        '.selModalInner',
        { visible: true }
      )
      modalItems = await page.$$(
        '.selModalInner .selModalList ul li.selModalClose'
      )
    } catch {
      broadcastEvent('generic_error', 'Modale per la scelta del set non trovata')
      // Se non lo trova, salvo screenshot+HTML per debug
      const debugDir = path.resolve(process.cwd(), 'debug-scrape')
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir)
      await page.screenshot({
        path: path.join(debugDir, 'modal-not-found.png'),
        fullPage: true
      })
      const html = await page.content()
      fs.writeFileSync(
        path.join(debugDir, 'modal-not-found.html'),
        html
      )
      throw new Error(
        'Impossibile trovare “.selModal .selModalList ul li.selModalClose”. Controlla debug-scrape/modal-not-found.html'
      )
    }
    console.log(`Trovati ${modalItems.length} elementi <li> nel modal.`);
    broadcastEvent('generic_info', `Trovati ${modalItems.length} set nella modale di scelta dei set.`)
    
    // Trova l’elemento <li> che contiene `expansionName`
    let foundSet = null
    for (const item of modalItems) {
      const txt = (await page.evaluate(el => el.textContent?.trim(), item)) || ''
      if (txt.toLowerCase().includes(expansionName.toLowerCase())) {
        foundSet = item
        break
      }
    }

    if (!foundSet) {
      broadcastEvent('generic_error', `Espansione "${expansionName}" non trovata nella lista del modal.`)
      throw new Error(`Espansione "${expansionName}" non trovata nella lista del modal.`)
    }

    const foundSetText = await page.evaluate(el => el.textContent?.trim(), foundSet)
    broadcastEvent('generic_info', `Trovato l’item: ${foundSetText}`)

    // 4) Clicca sull’item trovato
    await foundSet.click()
    broadcastEvent('generic_info', `Cliccato sul set "${foundSetText}"`)

    // 5) Clicca su "#frmSearch > div.commonBtn.submitBtn > input[type=submit]"
    await page.waitForSelector('#frmSearch > div.commonBtn.submitBtn > input[type=submit]', { visible: true })
    await page.click('#frmSearch > div.commonBtn.submitBtn > input[type=submit]')

    broadcastEvent('generic_info', `Cliccato sul tasto search"`)

    // 6) Attendi che i risultati siano caricati, poi clicca la prima carta:
    //    "#cardlist > main > article > div > div.resultCol > a:nth-child(1)"

    try {
      await page.waitForSelector('#cardlist > main > article > div > div.resultCol > a:nth-child(1)', { visible: true })
      await wait(2000)
      await page.click('#cardlist > main > article > div > div.resultCol > a:nth-child(1)')
    } catch (error) {
      broadcastEvent('generic_error', `Carte non trovate per l’espansione "${expansionName}". Potrebbe essere un errore di scraping o il set non esiste.`)
    }
    

    const cardsList = []
    // 7) Loop di estrazione per `numIterations` carte
    for (let i = 0; i < numIterations; i++) {
      // a) Attendi che il popup/fancybox sia presente
      await page.waitForSelector('.fancybox-slide--current', { visible: true })

      try {
        await page.$$(
          '.fancybox-slide--current .fancybox-content dt div.cardName'
        )
      } catch (error) {
        broadcastEvent('generic_error', `Problema durante l’attesa del popup/fancybox: ${error}`)
      }

      // b) Estraggo tutti i campi dal popup corrente
      const cardData = {}

      try {
        cardData.name       = await page.$eval(
          '.fancybox-slide--current dt div.cardName',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Nome carta non trovato nella slide corrente`)
        cardData.name = null
      }
      try {
        cardData.code       = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(1)',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Codice carta non trovato nella slide corrente`)
        cardData.code = null
      }

      broadcastEvent('generic_info', `Trovata carta "${cardData.name} -> ${cardData.code}".`)

      try {
        cardData.rarity     = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(2)',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Rarità carta non trovata per "${cardData.name} -> ${cardData.code}".`)
        cardData.rarity = null
      }
      try {
        cardData.type = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(3)',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Tipo carta non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.type = null
      }
      try {
        cardData.costLife   = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(1) div.cost',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore Life/Cost non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.costLife = null
      }
      try {
        cardData.attribute  = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(1) div.attribute i',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore attributo non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.attribute = null
      }
      try {
        cardData.power      = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(2) div.power',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore power non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.power = null
      }
      try {
        cardData.counter    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(2) div.counter',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore counter non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.counter = null
      }
      try {
        cardData.color      = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(3) div.color',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore color non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.color = null
      }
      try {
        cardData.family    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.feature',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore family non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.family = null
      }
      try {
        cardData.effect     = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.text',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore effect non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.effect = null
      }
      try {
        cardData.trigger    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.trigger',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore trigger non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.trigger = null
      }
      try {
        cardData.setName    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.getInfo:not(.remarks)',
          el => el.textContent?.trim() || ''
        )
      } catch(error) {
        broadcastEvent('generic_error', `Valore Card Set non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.setName = null
      }

      try {
        cardData.image = await page.$eval(
          '.fancybox-slide--current dd div.frontCol img',
          el => el.src || ''
        )
      } catch (error) {
        broadcastEvent('generic_error', `Valore immagine non trovato per "${cardData.name} -> ${cardData.code}".`)
        cardData.image = null
      }

      broadcastEvent('scraping_card_success', {name: cardData.name, code: cardData.code})

      // Aggiungo l’oggetto carta alla lista
      cardsList.push(cardData)

      // c) Clicca sulla freccia per passare alla carta successiva
      try {
        await page.waitForSelector('.fancybox-button.fancybox-button--arrow_right', { visible: true })
        await page.click('.fancybox-button.fancybox-button--arrow_right')
        // piccola pausa per lasciare il tempo al fancybox di aggiornarsi
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (err) {
        broadcastEvent('generic_error', `Iterazione #${i + 1}: impossibile cliccare “next” → ${err.message}`)
        break
      }
    }

    // 8) Al termine, chiudo il browser e ritorno l’array
    await browser.close()

    const endTime = Date.now()
    const ramEnd  = process.memoryUsage().heapUsed / 1024 / 1024

    broadcastEvent('scraping_completed', {
      url,
      totalCards: cardsList.length,
      duration: Math.round((endTime - startTime) / 1000),
      ramUsed: Math.round((ramEnd - ramStart) * 100) / 100
    })
    
    let result = await cardsList.map(remapCardsData)

    broadcastEvent('generic_success', `Rimappatura completata per ${expansionName}.`)

    printCardsInJson(expansionName, result)

    return result

  } catch (error) {
    // In caso di errore, chiudo sempre il browser e segnalo l’errore
    if (!browser._isClosed) {
      await browser.close()
    }
    broadcastEvent('generic_error', `Operazione fallita: ${error.message}`)
  }
}

function remapCardsData(cardData) {
  if (cardData.costLife) {
    try {
      const raw = cardData.costLife.trim()
      if (raw.startsWith('Life')) {
        const num = parseInt(raw.replace('Life', ''), 10)
        cardData.life = isNaN(num) ? null : num
      } else if (raw.startsWith('Cost')) {
        const num = parseInt(raw.replace('Cost', ''), 10)
        cardData.cost = isNaN(num) ? null : num
      }
    } catch (error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Cost/Life - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
    
  }
  delete cardData.costLife
  
  // power → intero senza “Power”
  if (cardData.power) {
    try {
      const raw = cardData.power.trim().replace('Power', '')
      const num = parseInt(raw, 10)
      cardData.power = isNaN(num) ? null : num
    } catch (error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Power - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
  }

  // effect → rimuovo “Effect” e trim
  if (cardData.effect) {
    try {
      const foundAbilities = abilityKeywords.filter(keyword =>
        cardData.effect.includes(keyword)
      );
      if (foundAbilities.length > 0) {
        cardData.abilityKeywords = foundAbilities;
      }

      const sanitizedEffect = cardData.effect.trim().replace('Effect', '')
      cardData.effect = sanitizedEffect === '-' ? null : sanitizedEffect;
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Effect - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
    
  }
  
  // counter → rimuovo “Counter”, se rimane "-" o vuoto → null, altrimenti intero
  if (cardData.counter) {
    try {
      const raw = cardData.counter.trim().replace('Counter', '')
      if (raw === '-' || raw === '') {
        cardData.counter = null
      } else {
        const num = parseInt(raw, 10)
        cardData.counter = isNaN(num) ? null : num
      }
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Counter - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
    
  }
  
  // color → array di stringhe, rimuovo “Color” e splitto su "/"
  if (cardData.color) {
    try {
      const raw = cardData.color.trim().replace('Color', '')
      cardData.color = raw
        .split('/')
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Color - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
  }
  
  // feature → rename in “family”, rimuovo “Type” e splitto su "/"
  if (cardData.family) {
    try {
      const raw = cardData.family.trim().replace('Type', '')
      cardData.family = raw
        .split('/')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Family - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
    
  }
  
  // prelevo codice espansione dal code della carta
  if (cardData.code) {
    try {
      const parts = cardData.code.split('-')
      cardData.expansionCode = parts[0]
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Code - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
  } else {
    cardData.expansionCode = null
  }
  
  // rimuovo eventuali spazi extra e trattini dal nome del set
  if (cardData.setName) {
    try {
      let raw = cardData.setName.replace(/^Card Set\(s\)-/, '')
      raw = raw.replace(/-\s*/, ' ')
      cardData.setName = raw.trim()
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Set name - ${cardData.name} di ${cardData.code}: ${error.message}`)
    } 
    
  }

  // rimuovo eventuali caratteri non necessari dall'url dell'immagine
  if (cardData.image) {
    try {
      cardData.image = cardData.image.split('?')[0]
    } catch(error) {
      console.log({error});
      broadcastEvent('generic_error', `Mappatura fallita nel campo Image - ${cardData.name} di ${cardData.code}: ${error.message}`)
    }
  }
  
  return cardData
}

function printCardsInJson(expansionName, cardsList) {
  try {
    const rawName = expansionName.replace(/[-\[\]]/g, '')    
      .replace(/\s+/g, ' ')                                    
      .trim()                                                  
    const fileName = rawName.replace(/\s/g, '_').toLowerCase() 

    const dir = path.join(process.cwd(), 'public', 'data', 'cards')

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const filePath = path.join(dir, `${fileName}.json`)
    fs.writeFileSync(
      filePath,
      JSON.stringify(cardsList, null, 2),
      'utf-8'
    )
    broadcastEvent('generic_success', `💾 File salvato in: ${filePath}`)
  } catch (error) {
    broadcastEvent('generic_error', `'Errore durante la stampa su json: ${error.message}"`)
  }
}

async function wait(ms){
    broadcastEvent('generic_info', `Attendo ${ms / 1000} secondi...`)
    await new Promise(resolve => setTimeout(resolve, ms))
    broadcastEvent('generic_info', `Proseguo`)
}

const abilityKeywords = [
  "[Rush]",
  "[Double Attack]",
  "[Banish]",
  "[Blocker]",
  "[Trigger]",
  "[On K.O.]",
  "[Activate: Main]",
  "[Main]",
  "[Counter]",
  "[When Attacking]",
  "[End of Your Turn]",
  "[End of Your Opponent's Turn]",
  "[Your Turn]",
  "[Opponent's Turn]",
  "[Once Per Turn]",
  "[On Block]",
  "[On Your Opponent's Attack]",
  "[DON!! x2]",
  "[DON!! x1]",
]
