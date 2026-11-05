import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import keycloak from './keycloak.js';
import './App.css';

keycloak.init({
  onLoad: 'login-required',
  pkceMethod: 'S256',
  checkLoginIframe: false
}).then(authenticated => {
  if (!authenticated) {
    keycloak.login();
    return;
  }
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><App /></React.StrictMode>
  );
}).catch(error => {
  console.error('Erreur de connexion Keycloak', error);
  document.getElementById('root').textContent =
    'Impossible de se connecter à Keycloak. Vérifiez que le serveur est démarré.';
});
