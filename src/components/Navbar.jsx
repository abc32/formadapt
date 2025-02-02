import { NavLink } from 'react-router-dom';
  import './Navbar.css';
  import translate from '../i18n';

  function Navbar() {
    return (
      <nav className="navbar" aria-label={translate('navbar.ariaLabel')}>
        <ul>
          <li><NavLink to="/" aria-current="page">{translate('navbar.home')}</NavLink></li>
          <li><NavLink to="/modules">{translate('navbar.modules')}</NavLink></li>
          {/* Ajoutez d'autres liens de navigation ici */}
        </ul>
      </nav>
    );
  }

  export default Navbar;
