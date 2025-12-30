import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';

export const usePeer = (role, code) => {
    const [peer, setPeer] = useState(null);
    const [call, setCall] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const localStreamRef = useRef(null);

    useEffect(() => {
        if (!code) return;

        // Create Peer
        // Reviewer ID: code-reviewer
        // User ID: code-user
        const myId = role === 'reviewer' ? `${code}-reviewer` : `${code}-user`;
        const targetId = role === 'reviewer' ? `${code}-user` : `${code}-reviewer`;

        const p = new Peer(myId);

        p.on('open', (id) => {
            setStatus(`Connected as ${id}`);
            setPeer(p);

            if (role === 'user') {
                // User calls Reviewer
                startCall(p, targetId);
            }
        });

        p.on('call', (incomingCall) => {
            console.log("Incoming call...", incomingCall);
            setStatus(`Incoming call from ${incomingCall.peer}...`);
            // Answer automatically (or prompt)
            // Reviewer needs a local stream to answer, but for receiving only, we can pass null
            // However, PeerJS requires a stream. Let's get audio-only stream for reviewer.
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                .then(stream => {
                    localStreamRef.current = stream;
                    incomingCall.answer(stream);
                    setupCallEvents(incomingCall);
                    setStatus(`Call connected with ${incomingCall.peer}`);
                })
                .catch(err => {
                    console.error("Failed to get media for answering call:", err);
                    setStatus(`Error answering call: ${err.message}`);
                });
        });

        p.on('error', (err) => {
            console.error("Peer Error:", err);
            setStatus(`Error: ${err.type}`);
        });

        return () => {
            p.destroy();
        };
    }, [role, code]);

    const startCall = async (p, targetId) => {
        setStatus(`Calling ${targetId}...`);
        try {
            // Get Local Stream (Audio + Screen/Video)
            // For AR User: We need to share the AR Canvas.
            // But AR Canvas on mobile is tricky to capture if it's WebXR.
            // Fallback: Get User Media (Camera) might fail if WebXR is active.
            // Strategy: Just Audio for now? Or try sharing screen.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            // Call
            const outgoingCall = p.call(targetId, stream);
            setupCallEvents(outgoingCall);
        } catch (e) {
            console.error("Media Error:", e);
            setStatus("Media Error: " + e.message);
        }
    };

    const setupCallEvents = (activeCall) => {
        setCall(activeCall);
        activeCall.on('stream', (stream) => {
            console.log("Remote Stream received");
            setRemoteStream(stream);
            if (role === 'reviewer') {
                setStatus(`Connected - Receiving stream from ${activeCall.peer}`);
            } else {
                setStatus(`Connected - Streaming to ${activeCall.peer}`);
            }
        });
        activeCall.on('close', () => {
            setStatus("Call Ended");
            setCall(null);
            setRemoteStream(null);
        });
        activeCall.on('error', (err) => {
            console.error("Call error:", err);
            setStatus(`Call Error: ${err.message || err.type}`);
        });
    };

    return { peer, call, remoteStream, status };
};
