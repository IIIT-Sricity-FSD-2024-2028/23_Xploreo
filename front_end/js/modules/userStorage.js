export function getStoredUsers() {

    const stored =
        localStorage.getItem("users");

    return stored
        ? JSON.parse(stored)
        : [];
}



export function saveUser(newUser) {

    const users =
        getStoredUsers();

    users.push(newUser);

    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

}