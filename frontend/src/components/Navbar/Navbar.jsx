import { navItems } from "./navConfig"
import { Link } from "react-router-dom";

export function Navbar(){
    const links = navItems.index;
    return(
        <nav>
            {
                links.map(link => (
                    <Link key = {link.path} to={link.path}>{link.name}</Link>
                ))
            }
        </nav>
    );
}