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
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [pingPos, setPingPos] = useState(null);

    // Pass AR active state to usePeer to optimize bandwidth during AR
    const { peer, status: peerStatus, endCall, sendData, data: remoteData, isDataConnected, toggleCamera, facingMode, initiateCall, call, isMuted, toggleMic } = usePeer('user', code, true);
    const [shareStatus, setShareStatus] = useState('');

    const handleStartReview = async () => {
        // Check if peer is ready
        if (!peer) {
            setShareStatus('⏳ Connecting...');
            // Wait a bit and retry
            setTimeout(handleStartReview, 1000);
            return;
        }

        setShareStatus('📤 Starting share...');
        const targetId = `${code}-reviewer`;

        try {
            await initiateCall(targetId);
            setShareStatus('✅ Broadcasting');
            setIsBroadcasting(true);
        } catch (err) {
            setShareStatus('❌ Error: ' + err.message);
            console.error("Share Screen error:", err);
        }
    };

    const handleEndCall = () => {
        endCall();
        setIsBroadcasting(false);
        navigate('/');
    };

    // Listen for Pings
    useEffect(() => {
        if (remoteData?.type === 'ping') {
            setPingPos({ x: remoteData.x, y: remoteData.y });
            setTimeout(() => setPingPos(null), 1000);
        }
    }, [remoteData]);

    return (
        <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: 'transparent',
            border: isBroadcasting ? '4px solid #28a745' : 'none',
            boxShadow: isBroadcasting ? 'inset 0 0 20px rgba(40,167,69,0.5)' : 'none',
            boxSizing: 'border-box'
        }}>
            {/* AR Scene in background */}
            <ARScene
                ref={arSceneRef}
                onStatusUpdate={setArStatus}
                onStatsUpdate={setStats}
                onSessionEnd={() => navigate('/')}
            />

            {/* Ripple Ping Animation */}
            {pingPos && (
                <div style={{
                    position: 'absolute',
                    left: `${pingPos.x}%`,
                    top: `${pingPos.y}%`,
                    width: 100,
                    height: 100,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '4px solid #00BFFF',
                    boxShadow: '0 0 40px #00BFFF',
                    zIndex: 9999,
                    animation: 'ripple 1s ease-out forwards',
                    pointerEvents: 'none'
                }} />
            )}



            {/* Overlay UI - Top Center Pill */}
            <div className="shiny-pill" style={{
                position: 'absolute',
                top: 25,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 30px',
                textAlign: 'center',
                minWidth: 160,
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}>
                {/* Live Indicator Pillar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginBottom: 4, padding: '2px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.3)'
                }}>
                    <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: isBroadcasting ? '#ff4d4d' : '#888' }}></div>
                    <span style={{ fontSize: 9, fontWeight: 900, color: isBroadcasting ? '#ff4d4d' : '#888', letterSpacing: '1px' }}>
                        {isBroadcasting ? 'BROADCASTING' : 'OFFLINE'}
                    </span>
                </div>

                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase' }}>Session Distance</div>
                <div style={{
                    fontSize: 28, fontWeight: 700, color: '#4da6ff', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4,
                    textShadow: '0 0 20px rgba(0,123,255,0.3)'
                }}>
                    {stats.total.split(' ')[0]} <span style={{ fontSize: 15, color: '#fff', opacity: 0.6, fontWeight: 500 }}>{stats.total.split(' ')[1]}</span>
                </div>
                {stats.area && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#00BFFF', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Area</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{stats.area}</div>
                    </div>
                )}
            </div >

            {/* Top Right Controls - Power Off / End Call Icon */}
            < div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 10 }}>
                {isBroadcasting && (
                    <button
                        onClick={toggleMic}
                        className="glass-btn"
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(0,191,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: 0
                        }}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        )}
                    </button>
                )}
                <button
                    onClick={handleEndCall}
                    className="glass-btn"
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'rgba(220,53,69,0.5)',
                        border: '1px solid rgba(220,53,69,0.3)',
                        padding: 0
                    }}
                    title="End Call"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                        <line x1="12" y1="2" x2="12" y2="12"></line>
                    </svg>
                </button>
            </div >

            {/* Middle Right Stack - Compacted */}
            <div style={{ position: 'absolute', right: 20, top: '55%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10, alignItems: 'center' }}>
                {/* Share Screen Button - Like Zoom/GMeet */}
                <button
                    onClick={handleStartReview}
                    className="glass-btn"
                    disabled={isBroadcasting}
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: isBroadcasting ? 'rgba(40,167,69,0.5)' : 'rgba(0,191,255,0.3)',
                        borderColor: isBroadcasting ? 'rgba(40,167,69,0.5)' : 'rgba(0,191,255,0.3)',
                        borderWidth: '2px'
                    }}
                    title={isBroadcasting ? "Broadcasting..." : "Share Screen"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path>
                        <polyline points="8 21 12 17 16 21"></polyline>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                        {isBroadcasting ? (
                            <>
                                <circle cx="18" cy="8" r="4" fill="#28a745" stroke="#28a745"></circle>
                            </>
                        ) : (
                            <>
                                <polyline points="17 8 22 8 22 3"></polyline>
                                <line x1="22" y1="8" x2="15" y2="15"></line>
                            </>
                        )}
                    </svg>
                </button>
                {/* Share Status Indicator */}
                {shareStatus && (
                    <div style={{
                        fontSize: 10,
                        color: '#fff',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        maxWidth: 80,
                        textAlign: 'center'
                    }}>
                        {shareStatus}
                    </div>
                )}
                <button
                    onClick={() => arSceneRef.current?.cycleUnit()}
                    className="glass-btn"
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        fontSize: 11,
                        fontWeight: 800,
                        background: 'rgba(255,255,255,0.12)',
                        borderColor: 'rgba(255,255,255,0.2)'
                    }}
                >
                    UNIT
                </button>
                <button
                    onClick={() => setShowPlan(!showPlan)}
                    className="glass-btn"
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: showPlan ? 'rgba(0,191,255,0.8)' : 'rgba(0,191,255,0.4)',
                        borderColor: 'rgba(0,191,255,0.3)',
                        borderWidth: '2px'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                </button>
            </div>

            {/* Floating Plan View */}
            {showPlan && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '92%',
                    height: '80%',
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    zIndex: 1000,
                    overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.95)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, color: '#222', fontSize: 20 }}>Project Plan</h3>
                        <button onClick={() => setShowPlan(false)} style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                    </div>
                    <PlanParser role="user" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                </div>
            )}

            {/* Conditional Bottom Controls - Repositioned above STOP AR */}
            {stats.count > 0 && (
                <div style={{ position: 'absolute', bottom: 105, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 15, zIndex: 10, padding: '0 20px' }}>
                    <button
                        onClick={() => arSceneRef.current?.undo()}
                        className="glass-btn"
                        style={{ padding: '12px 24px', borderRadius: 30, fontSize: 14, minWidth: 95 }}
                    >
                        Undo
                    </button>
                    <button
                        onClick={() => arSceneRef.current?.startNewLine()}
                        className="glass-btn glass-btn-primary"
                        style={{ padding: '12px 28px', borderRadius: 30, fontSize: 15, minWidth: 125, fontWeight: 800, letterSpacing: '0.5px' }}
                    >
                        New Line
                    </button>
                    <button
                        onClick={() => arSceneRef.current?.reset()}
                        className="glass-btn glass-btn-danger"
                        style={{ padding: '12px 24px', borderRadius: 30, fontSize: 14, minWidth: 95 }}
                    >
                        Reset
                    </button>
                </div>
            )}

            {/* Point Counter - Subtle Bottom right */}
            {
                stats.count > 0 && (
                    <div style={{ position: 'absolute', bottom: 20, right: 20, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}>
                        {stats.count} points measured
                    </div>
                )
            }
        </div >
    );
};

export default UserARView;