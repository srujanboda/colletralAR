import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');

    const startReviewer = () => {
        // Generate a code (for now, simple random)
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        navigate(`/reviewer?code=${code}`);
    };

    const joinUser = () => {
        if (joinCode) {
            navigate(`/ar-user?code=${joinCode}`);
        }
    };

    return (
        <div className="landing-container">
            <h1>Collateral AR</h1>

            <div className="role-card">
                <h2>Reviewer</h2>
                <p>Monitor measurements and verify floor plans.</p>
                <button onClick={startReviewer}>Start as Reviewer</button>
            </div>

            <div className="divider">OR</div>

            <div className="role-card">
                <h2>User (AR)</h2>
                <p>Take measurements on site.</p>
                <input
                    type="text"
                    placeholder="Enter Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                />
                <button onClick={joinUser}>Join Call</button>
            </div>
        </div>
    );
};

export default Landing;
