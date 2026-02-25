export function isValidCPF(cpf) {
    if (typeof cpf !== 'string') return false;

    // Remove characters that are not digits
    cpf = cpf.replace(/[^\d]+/g, '');

    // Check if it has 11 digits or if all digits are equal
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    // Validate first digit
    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    // Validate second digit
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}
