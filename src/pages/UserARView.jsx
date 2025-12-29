import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ARScene from '../components/ARScene';
import { usePeer } from '../hooks/usePeer';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');
    const { status } = usePeer('user', code); // Auto-calls reviewer
    const arRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <ARScene ref={arRef} onStatsUpdate={setStats} />

            {/* UI Overlay */}
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: 10, borderRadius: 8 }}>
                Code: {code} <br />
                Status: {status}
            </div>

            <div style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 20,
                fontSize: 24,
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
            }}>
                Total: <span style={{ color: '#ff4444' }}>{stats.total}</span> • {stats.count} pts
            </div>

            <div style={{ position: 'fixed', bottom: 40, width: '100%', display: 'flex', justifyContent: 'center', gap: 20 }}>
                <button onClick={() => arRef.current?.undo()} style={{ background: '#555' }}>
                    Undo
                </button>
                <button onClick={() => arRef.current?.startNewLine()} style={{ background: '#007bff' }}>
                    New Line
                </button>
                <button onClick={() => arRef.current?.reset()} style={{ background: '#dc3545' }}>
                    Reset
                </button>
            </div>

            {/* Video Call Manager (Hidden for now) */}
            {/* <CallManager code={code} role="user" /> */}
        </div>
    );
};

export default UserARView;
