import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const arSceneRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });
    const [arStatus, setArStatus] = useState("Initializing AR...");
    const [showPlan, setShowPlan] = useState(false);

    // Pass AR active state to usePeer to optimize bandwidth during AR
    const { status: peerStatus, endCall, sendData, data: remoteData, isDataConnected, toggleCamera, facingMode } = usePeer('user', code, true);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* AR Scene in background */}
            <ARScene
                ref={arSceneRef}
                onStatusUpdate={setArStatus}
                onStatsUpdate={setStats}
            />

            {/* Overlay UI - Top Center Pill */}
            <div style={{
                position: 'absolute',
                top: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: 40,
                padding: '12px 40px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 180,
                pointerEvents: 'none'
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '1px', marginBottom: 2 }}>TOTAL DISTANCE</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#3399ff' }}>
                    {stats.total.split(' ')[0]} <span style={{ fontSize: 18, color: '#fff' }}>{stats.total.split(' ')[1]}</span>
                </div>
            </div>

            {/* Status & Peer Info - Subtle Top Left */}
            <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', opacity: 0.6 }}>
                <div style={{ fontSize: 10, color: '#fff' }}>{arStatus}</div>
                <div style={{ fontSize: 10, color: '#aaa' }}>{peerStatus}</div>
            </div>

            {/* Right Side Circular Buttons */}
            <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 15 }}>
                <button
                    onClick={() => arSceneRef.current?.cycleUnit()}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                >
                    UNIT
                </button>
                <button
                    onClick={() => setShowPlan(!showPlan)}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#007bff',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,123,255,0.4)'
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                </button>
                <button
                    onClick={toggleCamera}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        marginTop: 10,
                        opacity: 0.7,
                        cursor: 'pointer'
                    }}
                >
                    {facingMode === 'user' ? '🔄' : '📷'}
                </button>
            </div>

            {/* Floating Plan View */}
            {showPlan && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    height: '80%',
                    maxHeight: '80%',
                    background: 'white',
                    borderRadius: 20,
                    padding: 20,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    overflow: 'auto',
                    color: 'black'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                        <h3 style={{ margin: 0 }}>Project Plan</h3>
                        <button onClick={() => setShowPlan(false)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 10 }}>✕</button>
                    </div>
                    <PlanParser role="user" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                </div>
            )}

            {/* Bottom Controls - Utilities */}
            <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 15, pointerEvents: 'none' }}>
                <button
                    onClick={() => arSceneRef.current?.undo()}
                    style={{
                        padding: '12px 30px',
                        borderRadius: 30,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        border: '1px solid #444',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 14,
                        fontWeight: 600
                    }}
                >
                    Undo
                </button>
                <button
                    onClick={() => arSceneRef.current?.startNewLine()}
                    style={{
                        padding: '12px 30px',
                        borderRadius: 30,
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: '0 4px 15px rgba(0,123,255,0.3)'
                    }}
                >
                    New Room
                </button>
                <button
                    onClick={() => arSceneRef.current?.reset()}
                    style={{
                        padding: '12px 30px',
                        borderRadius: 30,
                        background: 'rgba(220,53,69,0.7)',
                        color: 'white',
                        border: '1px solid rgba(220,53,69,0.3)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        fontSize: 14,
                        fontWeight: 600
                    }}
                >
                    Reset
                </button>
            </div>

            {/* Exit/End Call - Subtle Bottom Left */}
            <button
                onClick={handleEndCall}
                style={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: 12,
                    cursor: 'pointer',
                    opacity: 0.5
                }}
            >
                End Call
            </button>
        </div>
    );
};

export default UserARView;