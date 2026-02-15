const EMAIL_PATTERN = /.+@.+\..+/

export function validateAuthCredentials({ email, password, minPasswordLength } = {}) {
    const errors = []

    if(!email)
        errors.push("L'email e obbligatoria")
    else if(!EMAIL_PATTERN.test(email))
        errors.push('Inserisci un indirizzo email valido')

    if(!password)
        errors.push('La password e obbligatoria')
    else if(minPasswordLength && password.length < minPasswordLength)
        errors.push(`La password deve essere di almeno ${minPasswordLength} caratteri`)

    return errors
}
