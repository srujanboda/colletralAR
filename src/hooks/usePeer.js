import { useEffect, useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export const usePeer = (role, code, arActive = false) => {
    const [peer, setPeer] = useState(null);
    const [call, setCall] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const [conn, setConn] = useState(null);
    const [data, setData] = useState(null);
    const [isDataConnected, setIsDataConnected] = useState(false);
    const localStreamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isMuted, setIsMuted] = useState(true);

    function getVideoConstraints(mode, isAR) {
        const constraints = {
            facingMode: { ideal: mode },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 20, max: 30 }
        };
        if (isAR) {
            constraints.width = { ideal: 640 };
            constraints.height = { ideal: 480 };
            constraints.frameRate = { ideal: 12, max: 15 };
        }
        return constraints;
    }

    const setupCallEvents = useCallback((activeCall) => {
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
    }, [role]);

    const setupDataEvents = useCallback((dataConn) => {
        setConn(dataConn);
        dataConn.on('data', (receivedData) => {
            console.log("Data received:", receivedData?.type);
            setData(receivedData);
        });
        dataConn.on('open', () => {
            console.log("Data connection open with:", dataConn.peer);
            setIsDataConnected(true);
        });
        dataConn.on('close', () => {
            setConn(null);
            setIsDataConnected(false);
        });
        dataConn.on('error', (err) => {
            console.error("Data connection error:", err);
            setIsDataConnected(false);
        });
    }, []);

    const initiateCall = useCallback(async (targetId) => {
        if (!peer) return;
        setStatus(`Initiating Screen Share...`);
        try {
            let stream;
            if (role === 'user') {
                // 1. Get Screen Share ONLY (Decoupled from Mic)
                // This ensures we get the video feed even if mic permission fails later
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: getVideoConstraints(facingMode, arActive)
                });
            }

            localStreamRef.current = stream;
            const outgoingCall = peer.call(targetId, stream);
            setupCallEvents(outgoingCall);

            // Also ensure data connection is established
            if (!conn || !conn.open) {
                const dataConn = peer.connect(targetId);
                setupDataEvents(dataConn);
            }
        } catch (e) {
            console.error("Media/Call Error:", e);
            setStatus("Error: " + e.message);
        }
    }, [peer, role, facingMode, arActive, setupCallEvents, setupDataEvents, conn]);

    const refreshMediaTracks = useCallback(async () => {
        if (role === 'user') return; // Screen share doesn't need hardware refresh
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(facingMode, arActive)
            });
            localStreamRef.current = newStream;
            if (call && call.peerConnection) {
                const videoTrack = newStream.getVideoTracks()[0];
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }
        } catch (e) {
            console.error("Error refreshing media tracks:", e);
        }
    }, [role, facingMode, arActive, call]);

    useEffect(() => {
        if (!code) return;
        const myId = role === 'reviewer' ? `${code}-reviewer` : `${code}-user`;
        const targetId = role === 'reviewer' ? `${code}-user` : `${code}-reviewer`;
        setStatus("Connecting to Server...");
        const p = new Peer(myId);

        p.on('open', (id) => {
            console.log("Peer opened with ID:", id);
            setStatus(role === 'reviewer' ? "Waiting for someone to join..." : "Ready to start review...");
            setPeer(p);
            // DO NOT auto-call for user anymore to satisfy gesture requirement
        });

        p.on('connection', (dataConn) => {
            console.log("Incoming data connection-from:", dataConn.peer);
            setupDataEvents(dataConn);
        });

        p.on('call', async (incomingCall) => {
            console.log("Incoming call...", incomingCall);
            try {
                let stream;
                if (role === 'user') {
                    // Start screen share on incoming call if we haven't already
                    // Note: This might still trigger a gesture requirement in some browsers
                    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    stream = screenStream;
                } else {
                    // REVIEWER ANSWERING LOGIC
                    // Attempt to get mic, but if it fails, answer ANYWAY to see the user's screen
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    } catch (err) {
                        console.warn("Reviewer Mic failed, answering with empty stream to receive video", err);
                        // Create a dummy stream so we can still accept the call
                        const canvas = document.createElement('canvas');
                        stream = canvas.captureStream();
                    }
                }

                localStreamRef.current = stream;
                incomingCall.answer(stream);
                setupCallEvents(incomingCall);
            } catch (err) {
                console.error("Error answering call:", err);
            }
        });

        p.on('disconnected', () => p.reconnect());
        p.on('error', (err) => {
            console.error("Peer Error:", err);
            if (err.type === 'peer-unavailable') {
                setStatus(role === 'user' ? "Reviewer not online..." : "User not found...");
            }
        });

        return () => p.destroy();
    }, [role, code, setupCallEvents, setupDataEvents, facingMode, arActive]);

    useEffect(() => {
        if (role === 'user' && call && call.peerConnection) {
            refreshMediaTracks();
        }
    }, [arActive, role, call, refreshMediaTracks]);

    const sendData = (payload) => {
        if (conn && conn.open) {
            conn.send(payload);
        }
    };

    const toggleMic = async () => {
        // If we already have audio tracks, just toggle 'enabled'
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !nextMuted;
            });
            return;
        }

        // If no audio tracks yet (User hasn't granted permission yet), request it now
        if (role === 'user') {
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTrack = audioStream.getAudioTracks()[0];

                // Add to local stream
                if (localStreamRef.current) {
                    localStreamRef.current.addTrack(audioTrack);
                }

                // Add to active Peer Connection
                if (call && call.peerConnection) {
                    const senders = call.peerConnection.getSenders();
                    const audioSender = senders.find(s => s.track?.kind === 'audio');
                    if (audioSender) {
                        audioSender.replaceTrack(audioTrack);
                    } else {
                        call.peerConnection.addTrack(audioTrack, localStreamRef.current);
                    }
                }

                setIsMuted(false);
                setStatus("Microphone Activated");
            } catch (e) {
                console.error("Mic Permission Denied:", e);
                alert("Microphone permission denied. You can still share your screen.");
            }
        }
    };

    const toggleCamera = async () => {
        if (role === 'user') return; // User is screen sharing, camera flipping is handled by AR session itself
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(nextMode, arActive)
            });
            localStreamRef.current = newStream;
            if (call && call.peerConnection) {
                const videoTrack = newStream.getVideoTracks()[0];
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }
            setStatus(`Switched to ${nextMode} camera`);
        } catch (e) {
            console.error("Error switching camera:", e);
            setStatus("Camera switch error: " + e.message);
        }
    };

    const endCall = () => {
        if (call) call.close();
        if (peer) peer.destroy();

        // Stop all local tracks (Camera/Mic)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        setCall(null);
        setPeer(null);
        setRemoteStream(null);
        setConn(null);
        setIsDataConnected(false);
        setStatus("Call Ended Manually");
    };

    return { peer, call, remoteStream, status, endCall, sendData, data, isDataConnected, toggleCamera, facingMode, initiateCall, isMuted, toggleMic };
};
