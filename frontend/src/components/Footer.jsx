import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer id="contact" className="bg-slate-900 text-slate-400 mt-auto border-t border-slate-800">
            <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

                {/* Brand */}
                <div className="lg:col-span-2">
                    <h3 className="text-white text-xl font-bold mb-3">🤝 HelpConnect</h3>
                    <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
                        Connecting generous donors with verified NGOs to fulfill real-time material requirements — clothes, food, books, medicines, and more — for communities across India.
                    </p>
                    <div className="mt-5 space-y-1.5 text-sm">
                        <p>
                            📧{' '}
                            <a
                                href="mailto:support@helpconnect.org"
                                className="text-slate-400 hover:text-green-400 no-underline transition"
                            >
                                support@helpconnect.org
                            </a>
                        </p>
                        <p className="text-slate-500 text-xs">
                            NGO Donation &amp; Help Management Platform
                        </p>
                    </div>
                </div>

                {/* Browse */}
                <div>
                    <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Quick Links</h4>
                    <ul className="list-none p-0 m-0 space-y-2.5 text-sm">
                        <li>
                            <Link to="/" className="text-slate-400 hover:text-white no-underline transition">Home</Link>
                        </li>
                        <li>
                            <Link to="/requirements" className="text-slate-400 hover:text-white no-underline transition">Browse Donation Needs</Link>
                        </li>
                        <li>
                            <Link to="/ngos" className="text-slate-400 hover:text-white no-underline transition">Explore Verified NGOs</Link>
                        </li>
                        <li>
                            <a href="/#how-it-works" className="text-slate-400 hover:text-white no-underline transition">How It Works</a>
                        </li>
                        <li>
                            <a href="/#about" className="text-slate-400 hover:text-white no-underline transition">About HelpConnect</a>
                        </li>
                    </ul>
                </div>

                {/* Join */}
                <div>
                    <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest">Get Involved</h4>
                    <ul className="list-none p-0 m-0 space-y-2.5 text-sm">
                        <li>
                            <Link to="/register" className="text-slate-400 hover:text-white no-underline transition">Join as Donor</Link>
                        </li>
                        <li>
                            <Link to="/register-ngo" className="text-slate-400 hover:text-white no-underline transition">Register Your NGO</Link>
                        </li>
                        <li>
                            <Link to="/login" className="text-slate-400 hover:text-white no-underline transition">Login to Dashboard</Link>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-800 py-5 px-6">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                    <span>© {new Date().getFullYear()} HelpConnect — All rights reserved.</span>
                    <span className="text-slate-600">Built with ❤️ for communities in need</span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
