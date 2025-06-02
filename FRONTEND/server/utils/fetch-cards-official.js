import { broadcastEvent } from '../api/scrape-stream'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { log } from 'console'

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
  const numIterations = 3

  broadcastEvent('scraping_started', { expansionName })

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
      // Se fallisce la ricerca/click, ignoriamo e proseguiamo
    }

    console.log('premuto cookie button');
    

    // 2) Clicca su "#frmSearch > div.formsetDefaultArea > div.seriesCol > button"
    await page.waitForSelector('#frmSearch > div.formsetDefaultArea > div.seriesCol > button', { visible: true })
    await page.click('#frmSearch > div.formsetDefaultArea > div.seriesCol > button')

    console.log('aspettiamo');
    
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('andiamo avanti');
    
    // Attendo solo che compaia almeno un <li class="selModalClose"> da qualche parte
    /* await page.waitForSelector('.selModalInner', { visible: true })
    const selModalInner = await page.$$('.selModalInner .selModalList ul li.selModalClose')
    console.log(`Trovati ${selModalInner.length} elementi <li> nel modal.`); */

    /* const debugDir = path.resolve(process.cwd(), 'debug-scrape')
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir)
    await page.screenshot({
      path: path.join(debugDir, 'modal-not-found.png'),
      fullPage: true
    })
    const html = await page.content()
    fs.writeFileSync(
      path.join(debugDir, 'modal-not-found.html'),
      html
    ) */


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
    
    // Trova l’elemento <li> che contiene `expansionName`
    let foundItem = null
    for (const item of modalItems) {
      const txt = (await page.evaluate(el => el.textContent?.trim(), item)) || ''
      if (txt.toLowerCase().includes(expansionName.toLowerCase())) {
        foundItem = item
        break
      }
    }

    if (!foundItem) {
      throw new Error(`Espansione "${expansionName}" non trovata nella lista del modal.`)
    }

    console.log(`Trovato l’item: ${await page.evaluate(el => el.textContent?.trim(), foundItem)}`);

    // 4) Clicca sull’item trovato
    await foundItem.click()

    // 5) Clicca su "#frmSearch > div.commonBtn.submitBtn > input[type=submit]"
    await page.waitForSelector('#frmSearch > div.commonBtn.submitBtn > input[type=submit]', { visible: true })
    await page.click('#frmSearch > div.commonBtn.submitBtn > input[type=submit]')

    // 6) Attendi che i risultati siano caricati, poi clicca la prima carta:
    //    "#cardlist > main > article > div > div.resultCol > a:nth-child(1)"
    await page.waitForSelector('#cardlist > main > article > div > div.resultCol > a:nth-child(1)', { visible: true })
    await page.click('#cardlist > main > article > div > div.resultCol > a:nth-child(1)')

    const cardsList = []
    // 7) Loop di estrazione per `numIterations` carte
    for (let i = 0; i < numIterations; i++) {
      // a) Attendi che il popup/fancybox sia presente
      await page.waitForSelector('.fancybox-slide--current', { visible: true })

      const cardTest = await page.$$(
        '.fancybox-slide--current .fancybox-content dt div.cardName'
      )
      console.log('card test:', cardTest);
      

      // b) Estraggo tutti i campi dal popup corrente
      const cardData = {}

      try {
        cardData.name       = await page.$eval(
          '.fancybox-slide--current dt div.cardName',
          el => el.textContent?.trim() || ''
        )
        console.log("trovata carta:", cardData.name);
        
      } catch {
        cardData.name = null
      }
      try {
        cardData.code       = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(1)',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.code = null
      }
      try {
        cardData.rarity     = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(2)',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.rarity = null
      }
      try {
        cardData.headerType = await page.$eval(
          '.fancybox-slide--current dt div.infoCol span:nth-child(3)',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.headerType = null
      }
      try {
        cardData.costLife   = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(1) div.cost',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.costLife = null
      }
      try {
        cardData.attribute  = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(1) div.attribute i',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.attribute = null
      }
      try {
        cardData.power      = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(2) div.power',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.power = null
      }
      try {
        cardData.counter    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(2) div.counter',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.counter = null
      }
      try {
        cardData.color      = await page.$eval(
          '.fancybox-slide--current dd div.backCol div:nth-child(3) div.color',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.color = null
      }
      try {
        cardData.feature    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.feature',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.feature = null
      }
      try {
        cardData.effect     = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.text',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.effect = null
      }
      try {
        cardData.trigger    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.trigger',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.trigger = null
      }
      try {
        cardData.setInfo    = await page.$eval(
          '.fancybox-slide--current dd div.backCol div.getInfo:nth-child(1)',
          el => el.textContent?.trim() || ''
        )
      } catch {
        cardData.setInfo = null
      }
      console.log('carta estratta:', cardData.name || 'Sconosciuta');
      console.log({cardData});
      console.log('lista carte:', cardsList.length);
      
      // Aggiungo l’oggetto carta alla lista
      cardsList.push(cardData)

      // c) Clicca sulla freccia per passare alla carta successiva
      try {
        await page.waitForSelector('.fancybox-button.fancybox-button--arrow_right', { visible: true })
        await page.click('.fancybox-button.fancybox-button--arrow_right')
        // piccola pausa per lasciare il tempo al fancybox di aggiornarsi
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (err) {
        console.warn(`Iterazione #${i + 1}: impossibile cliccare “next” → ${err.message}`)
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
    console.log('FINITO COGLIONE');
    console.log({cardsList});
    
    return cardsList

  } catch (error) {
    // In caso di errore, chiudo sempre il browser e segnalo l’errore
    if (!browser._isClosed) {
      await browser.close()
    }
    broadcastEvent('scraping_cards_error', { expansionName, error: error.message })
    throw error
  }
}
