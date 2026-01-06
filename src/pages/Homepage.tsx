import { Link } from 'react-router-dom';
import './Homepage.css';

function Homepage() {
  return (
    <div className="homepage">
      <div className="hero">
        <div className="hero-content">
          <h1>Welcome to Loan Tracking System</h1>
          <p>Manage your loans, expenses, and payments all in one place</p>
          <Link to="/payments" className="cta-button">Get Started</Link>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <Link to="/payments" className="action-card">
            <h3>View All Payments</h3>
            <p>See all your financial records</p>
          </Link>
          <Link to="/people" className="action-card">
            <h3>Manage Contacts</h3>
            <p>View and manage people and groups</p>
          </Link>
        </div>
      </div>

      <div className="features">
        <h2>Features</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Track Loans & Expenses</h3>
            <p>Keep tabs on all your financial obligations effortlessly.</p>
          </div>
          <div className="feature-card">
            <h3>Manage Installments</h3>
            <p>Handle recurring payments with ease.</p>
          </div>
          <div className="feature-card">
            <h3>Group Expenses</h3>
            <p>Split costs among friends or groups seamlessly.</p>
          </div>
          <div className="feature-card">
            <h3>Partial Payments</h3>
            <p>Record and track partial settlements.</p>
          </div>
          <div className="feature-card">
            <h3>Payment Status</h3>
            <p>Monitor and update payment statuses in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;