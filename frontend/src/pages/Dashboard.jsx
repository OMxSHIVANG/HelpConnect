import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Dashboard() {
    const { user } = useContext(AuthContext);

    if (user?.role === "ngo") {
        return <Navigate to="/ngo/dashboard" replace />;
    }
    if (user?.role === "admin") {
        return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/donor/dashboard" replace />;
}

export default Dashboard;
