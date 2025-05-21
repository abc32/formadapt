import { NavLink, useNavigate } from 'react-router-dom';
  import './Navbar.css';
  import translate from '../i18n';

  function Navbar({ isLoggedIn, userRole, userName, handleLogout }) {
    const navigate = useNavigate();

    const onLogoutClick = () => {
      if (handleLogout) {
        handleLogout(navigate); // Pass navigate function to handleLogout
      }
    };

    return (
      <nav className="navbar" aria-label={translate('navbar.ariaLabel') || 'Main navigation'}>
        <ul>
          <li><NavLink to="/" aria-current="page">{translate('navbar.home') || 'Home'}</NavLink></li>
          <li><NavLink to="/modules">{translate('navbar.modules') || 'Modules'}</NavLink></li>
          
          {isLoggedIn ? (
            <>
              <li><NavLink to="/dashboard">{translate('navbar.dashboard') || 'Dashboard'}</NavLink></li>
              {userRole === 'admin' && (
                <li><NavLink to="/admin">{translate('navbar.admin') || 'Admin'}</NavLink></li>
              )}
              <li>
                <span className="navbar-username">
                  {translate('navbar.welcome', { name: userName || 'User' }) || `Welcome, ${userName || 'User'}`}
                </span>
              </li>
              <li>
                <button onClick={onLogoutClick} className="navbar-logout-button">
                  {translate('navbar.logout') || 'Logout'}
                </button>
              </li>
            </>
          ) : (
            <>
              <li><NavLink to="/login">{translate('navbar.login') || 'Login'}</NavLink></li>
              <li><NavLink to="/signup">{translate('navbar.signup') || 'Sign Up'}</NavLink></li>
            </>
          )}
          {/* Ajoutez d'autres liens de navigation ici */}
        </ul>
      </nav>
    );
  }

  export default Navbar;
