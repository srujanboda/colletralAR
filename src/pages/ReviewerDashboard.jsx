import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const ReviewerDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const { status, remoteStream, endCall, sendData, data: remoteData, isDataConnected, isMuted, toggleMic } = usePeer('reviewer', code);
    const videoRef = useRef(null);

    useEffect(() => {
        if (remoteStream && videoRef.current) {
            videoRef.current.srcObject = remoteStream;
        }
        return () => {
            if (videoRef.current) videoRef.current.srcObject = null;
        };
    }, [remoteStream]);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    const handleVideoClick = (e) => {
        if (!videoRef.current || !isDataConnected) return;
        const rect = videoRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        console.log("Sending Ping:", { x, y });
        sendData({ type: 'ping', x, y });
    };

    return (
        <div style={{ padding: '10px 1%', maxWidth: '100%', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>Reviewer Dashboard</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ padding: '10px 20px', background: '#333', borderRadius: 8, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ opacity: 0.6 }}>Code:</span> <strong>{code}</strong>
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }}></div>
                        <span style={{ color: isDataConnected ? '#28a745' : '#888', fontSize: 13 }}>
                            {isDataConnected ? '● User Online' : '○ Waiting...'}
                        </span>
                    </div>

                    {/* Mic Toggle */}
                    <button
                        onClick={toggleMic}
                        className="glass-btn"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            background: isMuted ? 'rgba(255,255,255,0.1)' : 'rgba(0,123,255,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={handleEndCall}
                        className="glass-btn glass-btn-danger"
                        title="End Call"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                            <line x1="12" y1="2" x2="12" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Video Column - Equal width with Plan Parser */}
                <div style={{
                    background: '#222',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minHeight: '85vh',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>User View</h3>
                            <span style={{ fontSize: 10, color: '#888', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                                Tip: Click video to "Ping" user
                            </span>
                        </div>
                        {remoteStream && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(40, 167, 69, 0.2)',
                                borderRadius: 20,
                                border: '1px solid rgba(40, 167, 69, 0.5)'
                            }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: '#28a745'
                                }}></div>
                                <span style={{ fontSize: 12, color: '#28a745', fontWeight: 'bold' }}>LIVE</span>
                            </div>
                        )}
                    </div>
                    <div style={{
                        width: '100%',
                        height: '70vh',
                        background: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                        margin: '0 auto',
                        position: 'relative',
                        cursor: isDataConnected ? 'crosshair' : 'default',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {remoteStream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                onClick={handleVideoClick}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    display: 'block'
                                }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#888',
                                textAlign: 'center',
                                padding: 40
                            }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    border: '3px solid #333',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20,
                                    background: 'rgba(255,255,255,0.02)'
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isDataConnected ? '#4da6ff' : '#444' }}>
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#aaa' }}>
                                    {isDataConnected ? 'User Joined' : 'Waiting for User Stream'}
                                </div>
                                <div style={{ fontSize: 14, color: '#666', maxWidth: 200 }}>
                                    {isDataConnected ? (
                                        'They are in the AR session. Waiting for them to start the Remote Review...'
                                    ) : (
                                        'Tell the User to start the Remote Review on their device.'
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Column - Equal width with User View */}
                <div style={{
                    background: '#222',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minHeight: '85vh',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: 15, color: '#fff' }}>Floor Plan Verification</h3>
                    <div style={{ flex: 1, width: '100%', overflow: 'auto', minWidth: 0 }}>
                        <PlanParser role="reviewer" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
