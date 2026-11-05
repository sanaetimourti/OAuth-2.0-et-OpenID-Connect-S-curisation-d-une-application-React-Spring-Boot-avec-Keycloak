import { useEffect, useState } from 'react';
import keycloak from './keycloak.js';
import { appelerApi } from './api.js';

export default function App() {
  const [objet, setObjet] = useState('');
  const [mesDemandes, setMesDemandes] = useState([]);
  const [toutes, setToutes] = useState([]);
  const [profil, setProfil] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const username = keycloak.tokenParsed?.preferred_username || 'Utilisateur';

  async function charger() {
    try {
      const [mine, profile] = await Promise.all([
        appelerApi('/api/demandes'),
        appelerApi('/api/profil')
      ]);
      setMesDemandes(mine);
      setProfil(profile);
      if (isAdmin) setToutes(await appelerApi('/api/admin/demandes'));
    } catch (e) {
      setMessage('Erreur : ' + e.message);
    }
  }

  useEffect(() => { charger(); }, []);

  async function creer(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await appelerApi('/api/demandes', {
        method: 'POST',
        body: JSON.stringify({ objet })
      });
      setObjet('');
      setMessage('Demande créée avec succès.');
      await charger();
    } catch (e) {
      setMessage('Erreur : ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function changerStatut(id, statut) {
    try {
      await appelerApi(`/api/admin/demandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut })
      });
      setMessage(statut === 'VALIDEE' ? 'Demande validée.' : 'Demande refusée.');
      await charger();
    } catch (e) {
      setMessage('Erreur : ' + e.message);
    }
  }

  return (
    <main className="container">
      <header className="top">
        <div>
          <p className="eyebrow">ESPACE SÉCURISÉ · OAUTH 2.0 / OIDC</p>
          <h1>Gestion des demandes</h1>
          <p>Connecté en tant que <strong>{username}</strong></p>
          <p className="roles">Rôles : {roles.join(', ')}</p>
        </div>
        <button className="secondary" onClick={() => keycloak.logout({ redirectUri: 'http://localhost:5173/' })}>
          Se déconnecter
        </button>
      </header>

      {profil && <section className="profile">
        <h2>Mon profil</h2>
        <p><strong>Identifiant :</strong> {profil.id}</p>
        <p><strong>Nom d'utilisateur :</strong> {profil.username}</p>
      </section>}

      <section>
        <h2>Créer une demande</h2>
        <form onSubmit={creer} className="create-form">
          <input value={objet} onChange={e => setObjet(e.target.value)}
            placeholder="Objet de la demande" required />
          <button type="submit" disabled={loading}>{loading ? 'Envoi...' : 'Envoyer'}</button>
        </form>
      </section>

      <section>
        <div className="section-heading"><h2>Mes demandes</h2><span>{mesDemandes.length} demande(s)</span></div>
        {mesDemandes.length === 0 ? <p className="empty">Vous n'avez pas encore de demande.</p> :
          <div className="list">{mesDemandes.map(d => <article className="request" key={d.id}>
            <div><strong>#{d.id} · {d.objet}</strong><p>Statut : <span className={`status ${d.statut.toLowerCase()}`}>{d.statut}</span></p></div>
          </article>)}</div>}
      </section>

      {isAdmin && <section className="admin">
        <div className="section-heading"><h2>Administration</h2><span>{toutes.length} demande(s)</span></div>
        <p className="hint">Seuls les utilisateurs ayant le rôle ADMIN peuvent modifier les statuts.</p>
        {toutes.length === 0 ? <p className="empty">Aucune demande enregistrée.</p> :
          <div className="list">{toutes.map(d => <article className="request" key={d.id}>
            <div><strong>#{d.id} · {d.objet}</strong><p>Propriétaire : {d.owner}</p>
              <p>Statut : <span className={`status ${d.statut.toLowerCase()}`}>{d.statut}</span></p></div>
            <div className="actions">
              {d.statut !== 'VALIDEE' && <button onClick={() => changerStatut(d.id, 'VALIDEE')}>Valider</button>}
              {d.statut !== 'REFUSEE' && <button className="danger" onClick={() => changerStatut(d.id, 'REFUSEE')}>Refuser</button>}
            </div>
          </article>)}</div>}
      </section>}

      {message && <p className="message" role="status">{message}</p>}
      <footer>Atelier pratique · Sécurité des systèmes distribués</footer>
    </main>
  );
}
