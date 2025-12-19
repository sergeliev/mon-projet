import React, { useEffect, useState } from "react";

export default function Paiement({ onNavigate }) {
  // recuperer userid et groupeid
  const userId = localStorage.getItem("userId");
  const groupeId = localStorage.getItem("groupeId");
  const [frequence, setFrequence] = useState(0);
  const [paidPeriods, setPaidPeriods] = useState([]); 
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!groupeId || !userId) return;// permet de voir le groupe 

    const load = async () => {
      try {
        const gr = await fetch(`http://localhost:5000/api/groupes/${groupeId}`);
        if (!gr.ok) throw new Error("Impossible de charger le groupe");
        const group = await gr.json();
        setFrequence(Number(group.frequence) || 0);

        const st = await fetch(`http://localhost:5000/api/paiement/status/${userId}/${groupeId}`);
        if (!st.ok) throw new Error("Impossible de charger le statut");// charger les donnees du groupe
        const paid = await st.json();
        setPaidPeriods(paid || []);
      } catch (err) {
        console.error(err);
        setMsg("Erreur de chargement des données.");
      }
    };

    load();
  }, [groupeId, userId]);

  const isPaid = (period) => {
    return paidPeriods.some((p) => Number(p.periodNumber) === Number(period));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
                                      // upload du fichier , voir periode de paiement
  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!userId || !groupeId) {
      setMsg("Utilisateur ou groupe non trouvé.");
      return;
    }
    if (!selectedPeriod) {
      setMsg("Veuillez sélectionner une période.");
      return;
    }
    if (isPaid(selectedPeriod)) {
      setMsg("Cette période est déjà payée.");
      return;
    }
    if (!file) {
      setMsg("Veuillez choisir un fichier (PDF/JPG/PNG).");// message d'erreur si on ne choisit pas un fichier pdf/jpg..
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("receipt", file);
      form.append("userId", userId);
      form.append("groupeId", groupeId);
      form.append("periodNumber", selectedPeriod);

      const res = await fetch("http://localhost:5000/api/paiement/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Erreur lors de l'envoi.");
      } else {
        setMsg("Reçu envoyé — en attente de validation.");
        setPaidPeriods((prev) => [
          ...prev,
          { periodNumber: Number(selectedPeriod), status: "en_attente", filePath: data.filePath },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMsg("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-brown" style={{ padding: 20 }}>
      <h2>Paiement hors-ligne</h2>

      {!groupeId && (
        <p style={{ color: "red" }}>Aucun groupe sélectionné.</p>
      )}

      <div style={{ margin: "20px 0" }}>
        <h3>Périodes (fréquence = {frequence})</h3>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Période</th>
              <th>Statut</th>
              <th>Reçu</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: frequence }, (_, i) => {
              const p = paidPeriods.find((x) => Number(x.periodNumber) === i + 1);
              return (
                <tr key={i}>
                  <td>Période {i + 1}</td>
                  <td style={{ color: p ? (p.status === "valide" ? "green" : "orange") : "red" }}>
                    {p ? (p.status === "valide" ? "Validé" : "En attente") : "Non payé"}
                  </td>
                  <td>
                    {p && p.filePath ? (
                      <a
                        href={`http://localhost:5000/uploads/${p.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir reçu
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleUpload}>
        <label>Période :</label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="">-- Choisir --</option>
          {Array.from({ length: frequence }, (_, i) => (
            <option key={i} value={i + 1} disabled={isPaid(i + 1)}> // implementation des lignes dependemment de la frequence
              Période {i + 1} {isPaid(i + 1) ? "(déjà payée)" : ""} // si paye peut passer a la ligne suivante
            </option>
          ))}
        </select>

        <br />
        <br />

        <label>Reçu :</label>
        <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />

        <br />
        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer"}
        </button>
      </form>

      <p>{msg}</p>
      <div className="form-container">
        <h2>Paiement en ligne(via stripe)</h2>
         <form>
      <input type="text" placeholder="Numéro de carte"  />
      <input type="number" placeholder="Montant"  />
      <button type="submit">Payer</button> </form>
     <p>{msg}</p>
      </div>
     
      <button onClick={() => onNavigate("accueil")} style={{ marginTop: 20 }}>
        ⬅ Retour
      </button>
    </div>
  );
}