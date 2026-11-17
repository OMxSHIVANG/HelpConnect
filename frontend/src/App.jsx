import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AgentAuthProvider } from "./context/AgentAuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectionRoute from "./components/ProtectionRoute";
import AgentProtectedRoute from "./components/AgentProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AgentLogin from "./pages/agent/AgentLogin";
import AgentActivate from "./pages/agent/AgentActivate";
import AgentDashboard from "./pages/agent/AgentDashboard";
import NGORegister from "./pages/NGORegister";
import NGOs from "./pages/NGOs";
import Requirements from "./pages/Requirements";
import RequirementDetails from "./pages/RequirementDetails";
import Donate from "./pages/Donate";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import PublicImpactProfile from "./pages/PublicImpactProfile";
import DonationTracking from "./pages/DonationTracking";
import PublicNGOProfile from "./pages/PublicNGOProfile";
import AgentLivePickupTracking from "./pages/AgentLivePickupTracking";

import DonorLayout from './pages/donor/DonorLayout';
import DonorHome from './pages/donor/DonorHome';
import DonorProfile from './pages/donor/DonorProfile';
import DonorDonations from './pages/donor/DonorDonations';
import FavouriteNGOs from './pages/donor/FavouriteNGOs';
import DonorNotifications from './pages/donor/DonorNotifications';
import DonorSettings from './pages/donor/DonorSettings';
import DonorImpactPassport from './pages/donor/DonorImpactPassport';
import DonorSmartMatch from './pages/donor/DonorSmartMatch';
import DonorPickups from './pages/donor/DonorPickups';
import DonorRecurring from './pages/donor/DonorRecurring';

import NGOLayout from './pages/ngo/NGOLayout';
import NGOHome from './pages/ngo/NGOHome';
import NGOProfile from './pages/ngo/NGOProfile';
import NGODonationRequests from './pages/ngo/NGODonationRequests';
import NGOCreateRequirement from './pages/ngo/NGOCreateRequirement';
import NGORequirements from './pages/ngo/NGORequirements';
import NGODonors from './pages/ngo/NGODonors';
import NGONotifications from './pages/ngo/NGONotifications';
import NGOSettings from './pages/ngo/NGOSettings';
import NGOPickupCalendar from './pages/ngo/NGOPickupCalendar';
import ManagePickupAgents from './pages/ngo/ManagePickupAgents';
import NGOTransparency from './pages/ngo/NGOTransparency';
import NGOCampaigns from './pages/ngo/NGOCampaigns';
import Messages from './pages/Messages';

import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProfile from './pages/admin/AdminProfile';
import AdminUsers from './pages/admin/AdminUsers';
import AdminNGOs from './pages/admin/AdminNGOs';
import AdminDonations from './pages/admin/AdminDonations';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminReviews from './pages/admin/AdminReviews';

function NotFound() {
    return (
        <div className="max-w-md mx-auto my-20 text-center px-6">
            <h1 className="text-6xl font-extrabold text-slate-900 mb-2">404</h1>
            <h2 className="text-xl font-bold text-slate-700 mb-3">Page Not Found</h2>
            <p className="text-slate-500 text-sm mb-6">The page you are looking for does not exist or has been moved.</p>
            <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold no-underline transition inline-block">
                Return to Home
            </Link>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AgentAuthProvider>
                <BrowserRouter>
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                        <Navbar />
                        <main style={{ flex: 1 }}>
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/agent/login" element={<AgentLogin />} />
                                <Route path="/agent/activate" element={<AgentActivate />} />
                                <Route path="/ngos" element={<NGOs />} />
                                <Route path="/ngos/:id" element={<PublicNGOProfile />} />
                                <Route path="/ngo/:id" element={<PublicNGOProfile />} />
                                <Route path="/requirements" element={<Requirements />} />
                                <Route path="/requirements/:id" element={<RequirementDetails />} />
                                <Route path="/campaigns" element={<Campaigns />} />
                                <Route path="/campaigns/:id" element={<CampaignDetails />} />
                                <Route path="/impact/:donorId" element={<PublicImpactProfile />} />
                                <Route path="/donation/:id/tracking" element={<DonationTracking />} />
                                <Route path="/pickup/agent/:id" element={<AgentLivePickupTracking />} />
                                <Route path="/agent/pickup/:id" element={<AgentLivePickupTracking />} />

                                {/* Dedicated Pickup Agent Protected Dashboard */}
                                <Route element={<AgentProtectedRoute />}>
                                    <Route path="/agent/dashboard" element={<AgentDashboard />} />
                                </Route>

                            {/* Authenticated Protected Routes */}
                            <Route element={<ProtectionRoute />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/donate/:requirementId" element={<Donate />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/register-ngo" element={<NGORegister />} />
                            </Route>

                            {/* Donor Protected Routes */}
                            <Route element={<ProtectionRoute allowedRoles={['user', 'admin']} />}>
                                <Route path="/my-donations" element={<Navigate to="/donor/donations" replace />} />
                                <Route path="/donor" element={<DonorLayout />}>
                                    <Route index element={<Navigate to="/donor/dashboard" replace />} />
                                    <Route path="dashboard" element={<DonorHome />} />
                                    <Route path="impact-passport" element={<DonorImpactPassport />} />
                                    <Route path="smart-match" element={<DonorSmartMatch />} />
                                    <Route path="pickups" element={<DonorPickups />} />
                                    <Route path="recurring" element={<DonorRecurring />} />
                                    <Route path="profile" element={<DonorProfile />} />
                                    <Route path="donations" element={<DonorDonations />} />
                                    <Route path="messages" element={<Messages />} />
                                    <Route path="favourites" element={<FavouriteNGOs />} />
                                    <Route path="notifications" element={<DonorNotifications />} />
                                    <Route path="settings" element={<DonorSettings />} />
                                </Route>
                            </Route>

                            {/* NGO Protected Routes */}
                            <Route element={<ProtectionRoute allowedRoles={['ngo', 'admin']} />}>
                                <Route path="/ngo-dashboard" element={<Navigate to="/ngo/dashboard" replace />} />
                                <Route path="/ngo" element={<NGOLayout />}>
                                    <Route index element={<Navigate to="/ngo/dashboard" replace />} />
                                    <Route path="dashboard" element={<NGOHome />} />
                                    <Route path="transparency" element={<NGOTransparency />} />
                                    <Route path="pickups" element={<NGOPickupCalendar />} />
                                    <Route path="agents" element={<ManagePickupAgents />} />
                                    <Route path="campaigns" element={<NGOCampaigns />} />
                                    <Route path="profile" element={<NGOProfile />} />
                                    <Route path="donations" element={<NGODonationRequests />} />
                                    <Route path="create-requirement" element={<NGOCreateRequirement />} />
                                    <Route path="requirements" element={<NGORequirements />} />
                                    <Route path="donors" element={<NGODonors />} />
                                    <Route path="messages" element={<Messages />} />
                                    <Route path="notifications" element={<NGONotifications />} />
                                    <Route path="settings" element={<NGOSettings />} />
                                </Route>
                            </Route>

                            {/* Admin Protected Routes */}
                            <Route element={<ProtectionRoute allowedRoles={['admin']} />}>
                                <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                                <Route path="/admin" element={<AdminLayout />}>
                                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                    <Route path="dashboard" element={<AdminOverview />} />
                                    <Route path="profile" element={<AdminProfile />} />
                                    <Route path="alerts" element={<AdminAlerts />} />
                                    <Route path="audit-logs" element={<AdminAuditLogs />} />
                                    <Route path="campaigns" element={<AdminCampaigns />} />
                                    <Route path="reviews" element={<AdminReviews />} />
                                    <Route path="users" element={<AdminUsers />} />
                                    <Route path="ngos" element={<AdminNGOs />} />
                                    <Route path="donations" element={<AdminDonations />} />
                                    <Route path="settings" element={<AdminSettings />} />
                                </Route>
                            </Route>

                            {/* 404 Catch-All */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </BrowserRouter>
        </AgentAuthProvider>
    </AuthProvider>
);
}

export default App;
