import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ARScene from '../components/ARScene';
import { usePeer } from '../hooks/usePeer';
import PlanParser from '../components/PlanParser';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');
    const { status } = usePeer('user', code); // Auto-calls reviewer
    const arRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });
    const [showPlanParser, setShowPlanParser] = useState(false);


    const uiRef = useRef(null);

    // Prevent WebXR taps when interacting with UI
    useEffect(() => {
        const preventXR = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const uiContainer = uiRef.current;
        if (uiContainer) {
            // "beforexrselect" is the standard event to stop XR interaction from DOM overlay
            uiContainer.addEventListener('beforexrselect', preventXR);
        }

        return () => {
            if (uiContainer) {
                uiContainer.removeEventListener('beforexrselect', preventXR);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <ARScene ref={arRef} onStatsUpdate={setStats} />

            {/* Main UI Container - Hooks generic beforexrselect prevention */}
            <div ref={uiRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

                {/* Stats Bar (Top) */}
                <div className="glass-panel info-badge" style={{
                    position: 'absolute',
                    top: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '8px 24px',
                    borderRadius: 30,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'auto'
                }}>
                    <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Total Distance</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        <span style={{ color: '#4cc9f0' }}>{stats.total.split(' ')[0]}</span>
                        <span style={{ fontSize: 16, marginLeft: 4 }}>{stats.total.split(' ')[1]}</span>
                    </div>
                </div>

                {/* Right Dock (Tools) */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: 20,
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    pointerEvents: 'auto'
                }}>
                    {/* Unit Toggle */}
                    <button
                        className="glass-btn"
                        onClick={(e) => { e.stopPropagation(); arRef.current?.cycleUnit(); }}
                        style={{ width: 56, height: 56, borderRadius: '50%' }}
                    >
                        <span style={{ fontSize: 14, fontWeight: 'bold' }}>UNIT</span>
                    </button>

                    {/* Plan Parser */}
                    <button
                        className="glass-btn glass-btn-primary"
                        onClick={(e) => { e.stopPropagation(); setShowPlanParser(true); }}
                        style={{ width: 56, height: 56, borderRadius: '50%' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                </div>

                {/* Bottom Bar (Controls) - Only if active */}
                {stats.count > 0 && (
                    <div className="glass-panel" style={{
                        position: 'absolute',
                        bottom: 40,
                        left: '50%',
                        transform: 'translateX(-50%)', // Center it
                        padding: '12px', // Inner padding
                        borderRadius: 24, // Pill shape
                        display: 'flex',
                        gap: 12,
                        pointerEvents: 'auto',
                        width: 'auto', // Auto width based on content
                        maxWidth: '90%' // Max width margin
                    }}>
                        <button
                            className="glass-btn"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.undo(); }}
                            style={{ borderRadius: 16, padding: '0 20px', height: 44 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
                            Undo
                        </button>

                        <button
                            className="glass-btn glass-btn-primary"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.startNewLine(); }}
                            style={{ borderRadius: 16, padding: '0 20px', height: 44 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            New Line
                        </button>

                        <button
                            className="glass-btn glass-btn-danger"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.reset(); }}
                            style={{ borderRadius: 16, padding: '0 20px', height: 44 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Plan Parser Modal */}
            {showPlanParser && (
                <div className="glass-panel" style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(20,20,20,0.95)',
                    backdropFilter: 'blur(20px)',
                    overflowY: 'auto',
                    padding: 20
                }}>
                    <button
                        className="glass-btn"
                        onClick={() => setShowPlanParser(false)}
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            width: 40, height: 40, borderRadius: '50%',
                            border: 'none', background: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        ✕
                    </button>
                    <h2 style={{ color: 'white', textAlign: 'center', marginBottom: 30, fontFamily: 'Outfit' }}>Plan Parser</h2>

                    {/* Pass a prop or wrap PlanParser to style it internally? 
                        For now, just render it. The inner "PlanParser" implementation is raw HTML style 
                        so it might look a bit plain inside this premium modal, but acceptable for now. 
                    */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, maxWidth: 800, margin: '0 auto' }}>
                        <PlanParser />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserARView;
