export function validateEmail(email) {
    return email.includes("@");
}

export function validatePhone(phone) {
    return phone.length >= 10;
}