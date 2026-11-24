export function renderWelcomemsg(containerId,user) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<h1>Welcome back, ${user.name}! 👋</h1>
    <p>Here what's happened with your tours today !</p>`
}