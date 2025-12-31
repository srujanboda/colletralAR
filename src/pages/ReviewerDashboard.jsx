import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const ReviewerDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const { status, remoteStream, endCall } = usePeer('reviewer', code);
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>Reviewer Dashboard</h1>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ padding: '10px 20px', background: '#333', borderRadius: 8, color: 'white' }}>
                        Code: <strong>{code}</strong> ({status})
                    </div>
                    <button
                        onClick={handleEndCall}
                        className="glass-btn glass-btn-danger"
                        style={{ borderRadius: 8, padding: '10px 20px' }}
                    >
                        End Call
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Video Column */}
                <div style={{ background: '#222', borderRadius: 12, padding: 20, minHeight: 400 }}>
                    <h3>User View</h3>
                    <div style={{ width: '100%', height: 300, background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%' }}></video>
                    </div>
                </div>

                {/* Plan Column */}
                <div>
                    <h3>Floor Plan Verification</h3>
                    <PlanParser />
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
