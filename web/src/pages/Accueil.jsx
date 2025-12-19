function Accueil({ onNavigate }) {
  return (
    <div className="page page-default">
      <h1>Bienvenue dans le Sol</h1>
      <img src="2 mains.jpg" alt="illustration" />
      <br />
      <button onClick={() => onNavigate("login")}>Se connecter </button> {/* ✅ nouveau bouton */}
      <button onClick={() => onNavigate("inscription")}>S'inscrire</button>
      <button onClick={() => window.location.href='https://www.google.com'}>Quitter</button>
    </div>
  );
}
export default Accueil;



