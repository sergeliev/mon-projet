import { useEffect, useState } from "react";

function MemberView({ onNavigate }) {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("userId"); // recupere userid
// pour afficher les groupes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/groupes");
        const data = await res.json();
        setGroupes(data);
      } catch (err) {
        console.error(err);
        alert("Impossible de charger les groupes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
// pour participer a un groupe et stocke groupid,groupe choisi
  const handleParticiper = async (groupe) => {
    if (!userId) { alert("Utilisateur non identifié"); return; }
    const groupeId = groupe.id;
    try {
      const res = await fetch("http://localhost:5000/api/participer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupeId })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erreur participer"); return; }

      localStorage.setItem("groupeId", groupeId);
      localStorage.setItem("groupeChoisi", JSON.stringify(groupe));
      alert("Participation enregistrée");
      onNavigate("confirmation");
    } catch (err) {
      console.error(err);
      alert("Impossible de contacter le serveur.");
    }
  };

  if (loading) return <h2>Chargement...</h2>;

  return (
    <div className="page page-brown">
      <h2>Groupes disponibles</h2>
      <h3>Veuillez choisir le groupe dans lequel vous voulez participer</h3>
      {groupes.length === 0 ? <p>Aucun groupe</p> : (
        <div>
          {groupes.map(g => (
            <div key={g.id} className="group-list">
              <h3>{g.nomSol}</h3>
              <p>Montant: {g.montantParPeriode}</p>
              <p>Fréquence: {g.frequence}</p>
              <p>Participants: {g.nombreParticipants}</p>
              <button classname="participer-btn" onClick={() => handleParticiper(g)}>Participer</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => onNavigate("accueil")}>Déconnexion</button>
    </div>
  );
}

export default MemberView;