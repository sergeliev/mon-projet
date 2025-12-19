import { useEffect, useState } from "react";

function MemberDashboard({ onNavigate }) {
  const [groupe, setGroupe] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/user/group/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setGroupe(data);
          localStorage.setItem("groupeId", data.id);
        }
      })
      .catch(err => console.error("Erreur groupe:", err));
  }, [userId]);

  if (!groupe) return <p>Chargement...</p>;

  return (
    <div className="page">
      <h2>Votre Groupe</h2>
      <p><b>Nom :</b> {groupe.nomSol}</p>
      <p><b>Montant :</b> {groupe.montantParPeriode}</p>
      <p><b>Fréquence :</b> {groupe.frequence}</p>
      <p><b>Participants :</b> {groupe.nombreParticipants}</p>

      <button onClick={() => onNavigate("paiement")}>Réaliser votre paiement</button>
      <button onClick={() => onNavigate("accueil")}>Déconnexion</button>
      </div>
  );
}

export default MemberDashboard;
