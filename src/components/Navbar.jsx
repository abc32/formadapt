import { NavLink } from 'react-router-dom';
  import './Navbar.css';
  // Removed direct import of translate: import translate from '../i18n';
  import { useI18n } from '../i18n'; // Import useI18n hook

  function Navbar() {
    const { translate } = useI18n(); // Use the hook to get translate function
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
