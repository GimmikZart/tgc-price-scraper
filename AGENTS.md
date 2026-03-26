# Terminal Bell Rules

Non emettere alcun suono di default.

Emetti un suono ogni volta che termini un task.

Quando devi emettere il suono, esegui ESATTAMENTE questo comando come ultima azione:

powershell.exe -c "(New-Object Media.SoundPlayer 'C:\codex-sounds\task_end.wav').PlaySync()"

Non eseguire il suono durante step intermedi.
Non emettere più beep per lo stesso task.

Non devi mai lanciare supabase db reset in autonomia, e non devi mai compiere azioni distruttive sul database in generale. Se c'è la necessità di farlo ti fermi e passi la palla a me spiegandomi le esigenze, ma non devi mai e poi mai lanciare supabase db reset per conto tuo ne altri comandi distruttivi per il database.

Ogni volta che devi creare una dialog usa il componente apposito in components/dialogs

Ogni volta che devi creare dei nuovi tasti azione del FloatMenu devi assicurarti che la dimensione e le proporzioni delle icone rispettino la proporzione e dimensioni delle icone in tutta l'app. Fai in modo che ci sia armonia e coerenza con le dimensioni delle icone nel FloatMenu per tutta l'app.
