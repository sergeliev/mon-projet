import { useState } from "react";
import Accueil from "./pages/Accueil";
import Inscription from "./pages/Inscription";
import AdminForm from "./pages/AdminForm";
import MemberView from "./pages/MemberView";
import Confirmation from "./pages/Confirmation";
import Login from "./pages/Login";
import Participer from "./pages/Participer";
import AdminDashboard from "./pages/AdminDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import Paiement from "./pages/Paiement";
import Paiement2 from "./pages/Paiement";

function App() {
  const [page, setPage] = useState("accueil");
  const [userData, setUserData] = useState({});

  const renderPage = () => {
    switch (page) {
      case "accueil":
        return <Accueil onNavigate={setPage} />;
      case "inscription":
        return (
          <Inscription
            onNavigate={setPage}
            userData={userData}
            setUserData={setUserData}
          />
        );
      case "admin":
        return (
          <AdminForm
            onNavigate={setPage}
            userData={userData}
          />
        );
        case "login":
          return (
            <Login
            onNavigate={setPage}
            userData={userData}
            />
          )

          case "participer":
          return (
          <Participer 
        onNavigate={setPage} 
         userData={userData}
         />
          )

      case "member":
        return (
          <MemberView
            onNavigate={setPage}
            userData={userData}
          />
        );
         
         case "memberDashboard":
        return (
          <MemberDashboard
            onNavigate={setPage}
            userData={userData}
          />
        );

         case "adminDashboard":
        return (
          <AdminDashboard
            onNavigate={setPage}
            userData={userData}
          />
        );

        case "paiement":
        return (
          <Paiement
            onNavigate={setPage}
            userData={userData}
          />
        );
         
         case "paiement2":
        return (
          <Paiement2
            onNavigate={setPage}
            userData={userData}
          />
        );
         
         




      case "confirmation":
        return <Confirmation onNavigate={setPage} />;
      default:
        return <Accueil onNavigate={setPage} />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;

