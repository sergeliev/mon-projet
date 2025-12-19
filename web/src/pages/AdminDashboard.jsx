import { useEffect, useState } from "react";

function AdminDashboard({ onNavigate }) {
  const [groupe, setGroupe] = useState(null);

  const userEmail = localStorage.getItem("userEmail"); // recupere email du créateur

  useEffect(() => {
    fetch("http://localhost:5000/api/groupes")
      .then(res => res.json())
      .then(data => {
        // 🔥 Filtrer pour obtenir le groupe créé par l'admin connecté
        const groupeAdmin = data.find(g => g.createdBy === userEmail);

        setGroupe(groupeAdmin || null);
      })
      .catch(err => console.error("Erreur chargement groupes:", err));
  }, [userEmail]);

  if (!groupe) {
    return (
      <div className="page page-brown">
        <h2>Votre Sol</h2>
        <p>Aucun groupe trouvé pour vous ({userEmail}).</p>

        <button onClick={() => onNavigate("accueil")}>⬅ Déconnexion</button>
      </div>
    );
  }

  return (
    <div className="page page-brown">
      <h2>Votre Sol créé</h2>

      <div className="card">
        <h3>{groupe.nomSol}</h3>

        <p><b>Montant:</b> {groupe.montantParPeriode}$</p>
        <p><b>Fréquence:</b> {groupe.frequence} jours</p>
        <p><b>Statut:</b> {groupe.statut}</p>
        <p><b>Participants:</b> {groupe.nombreParticipants}</p>
        <p><b>Date création:</b> {groupe.dateCreation}</p>

        <button onClick={() => onNavigate("gestionGroupe")}>
          🛠 Gérer le groupe
        </button>

        <button onClick={() => onNavigate("paiement")}>
          💳 Effectuer votre paiement
        </button>
      </div>

      <button onClick={() => onNavigate("accueil")}>⬅ Déconnexion</button>
    </div>
  );
}

export default AdminDashboard;