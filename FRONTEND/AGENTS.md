# Terminal Bell Rules

Non emettere alcun suono di default.

Emetti un suono SOLO se il messaggio dell’utente contiene "#alert".

Quando devi emettere il suono, esegui ESATTAMENTE questo comando come ultima azione:

powershell.exe -c "(New-Object Media.SoundPlayer 'C:\codex-sounds\task_end.wav').PlaySync()"

Non eseguire il suono durante step intermedi.
Non emettere più beep per lo stesso task.
