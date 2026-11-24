export function generateUniqueUserId(existingUsers) {

    let id;
    let isDuplicate;

    do {

        id = Math.floor(
            100 + Math.random() * 900
        ).toString();

        isDuplicate =
            existingUsers.some(
                user => user.id === id
            );

    } while (isDuplicate);

    return id;
}