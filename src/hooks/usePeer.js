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
        console.log("🔧 Setting up call events for:", activeCall.peer);
        setCall(activeCall);

        activeCall.on('stream', (stream) => {
            console.log("🎥 Remote Stream received!", {
                id: stream.id,
                videoTracks: stream.getVideoTracks().length,
                audioTracks: stream.getAudioTracks().length
            });
            setRemoteStream(stream);
            if (role === 'reviewer') {
                setStatus(`Connected - Receiving stream from ${activeCall.peer}`);
            } else {
                setStatus(`Connected - Streaming to ${activeCall.peer}`);
            }
        });

        activeCall.on('close', () => {
            console.log("📴 Call closed");
            setStatus("Call Ended");
            setCall(null);
            setRemoteStream(null);
        });

        activeCall.on('error', (err) => {
            console.error("❌ Call error:", err);
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

    // Handle special messages for video streaming coordination
    const handleStreamCoordination = useCallback((message) => {
        if (!peer) return;

        if (message.type === 'READY_TO_STREAM' && role === 'reviewer') {
            // User is ready to stream - Reviewer should call them
            console.log("📞 User ready to stream, Reviewer initiating call...");
            setStatus("User ready - connecting video...");

            // Create minimal stream to initiate call
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const dummyStream = canvas.captureStream(1);

            const outgoingCall = peer.call(message.userId, dummyStream);
            if (outgoingCall) {
                console.log("📞 Reviewer: Call initiated to User");
                setupCallEvents(outgoingCall);
            }
        }

        if (message.type === 'CALL_REQUEST' && role === 'user') {
            // Reviewer is requesting video - User should share screen
            console.log("📞 Reviewer requesting stream, User initiating screen share...");
        }
    }, [peer, role, setupCallEvents]);

    const initiateCall = useCallback(async (targetId) => {
        if (!peer) {
            console.error("❌ Cannot initiate call - peer not ready");
            setStatus("Error: Not connected to signaling server");
            return;
        }
        console.log("📤 Initiating screen share...");
        setStatus(`Getting screen share...`);
        try {
            let stream;
            if (role === 'user') {
                // 1. Get Screen Share ONLY
                console.log("📤 Requesting screen share...");
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                console.log("📤 Screen share obtained:", stream.getVideoTracks().length, "video tracks");

                // Store the stream for when we answer the call
                localStreamRef.current = stream;

                // 2. Notify Reviewer via data channel that we're ready
                if (conn && conn.open) {
                    console.log("📤 Sending READY_TO_STREAM to Reviewer...");
                    conn.send({
                        type: 'READY_TO_STREAM',
                        userId: `${code}-user`
                    });
                    setStatus("Ready - waiting for Reviewer to connect video...");
                } else {
                    console.error("❌ Data connection not open, can't notify Reviewer");
                    setStatus("Error: Not connected to Reviewer");
                }
            } else {
                // Reviewer initiating (shouldn't normally happen)
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: getVideoConstraints(facingMode, arActive)
                });
                localStreamRef.current = stream;
                const outgoingCall = peer.call(targetId, stream);
                if (outgoingCall) {
                    setupCallEvents(outgoingCall);
                }
            }
        } catch (e) {
            console.error("❌ Media/Call Error:", e);
            setStatus("Error: " + e.message);
        }
    }, [peer, role, facingMode, arActive, setupCallEvents, conn, code]);

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

        // ICE servers configuration for better NAT traversal
        // Using free Metered.ca TURN servers and Google STUN
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.relay.metered.ca:80' },
            // Free TURN servers from Metered.ca (limited but works for testing)
            {
                urls: 'turn:global.relay.metered.ca:80',
                username: 'e8dd65d92ae694a9bcc80ac9',
                credential: 'uIXtdBQrv1LjHkLp'
            },
            {
                urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                username: 'e8dd65d92ae694a9bcc80ac9',
                credential: 'uIXtdBQrv1LjHkLp'
            },
            {
                urls: 'turn:global.relay.metered.ca:443',
                username: 'e8dd65d92ae694a9bcc80ac9',
                credential: 'uIXtdBQrv1LjHkLp'
            },
            {
                urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                username: 'e8dd65d92ae694a9bcc80ac9',
                credential: 'uIXtdBQrv1LjHkLp'
            }
        ];

        const p = new Peer(myId, {
            config: {
                iceServers: iceServers
            },
            debug: 2 // Enable debug logging
        });

        p.on('open', (id) => {
            console.log("✅ Peer opened with ID:", id);
            setStatus(role === 'reviewer' ? "Waiting for someone to join..." : "Ready - connecting to reviewer...");
            setPeer(p);

            // Auto-connect DATA channel for presence detection (no gesture required)
            if (role === 'user') {
                console.log("📤 User: Auto-connecting data channel to reviewer...");
                const dataConn = p.connect(targetId);
                setupDataEvents(dataConn);
            }
        });

        p.on('connection', (dataConn) => {
            console.log("Incoming data connection-from:", dataConn.peer);
            setupDataEvents(dataConn);
        });


        p.on('call', async (incomingCall) => {
            console.log("📞 Incoming call from:", incomingCall.peer);
            setStatus("Incoming call - answering...");

            try {
                let stream;
                if (role === 'user') {
                    // User receiving call from Reviewer
                    // Use the screen share we already captured
                    if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
                        console.log("📞 User: Answering with existing screen share");
                        stream = localStreamRef.current;
                    } else {
                        // Fallback: request screen share if not already captured
                        console.log("📞 User: No screen share found, requesting new one...");
                        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                        localStreamRef.current = stream;
                    }
                } else {
                    // REVIEWER ANSWERING - Answer immediately with minimal stream
                    console.log("📞 Reviewer: Answering call immediately");
                    const canvas = document.createElement('canvas');
                    canvas.width = 1;
                    canvas.height = 1;
                    stream = canvas.captureStream(1);
                }

                incomingCall.answer(stream);
                console.log("📞 Call answered successfully with", stream.getVideoTracks().length, "video tracks");
                setStatus("Call answered - streaming...");
                setupCallEvents(incomingCall);
            } catch (err) {
                console.error("❌ Error answering call:", err);
                setStatus("Error answering call: " + err.message);
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

    // Handle stream coordination messages
    useEffect(() => {
        if (data && data.type === 'READY_TO_STREAM') {
            handleStreamCoordination(data);
        }
    }, [data, handleStreamCoordination]);

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

        // If no audio tracks yet, request permission now (works for both User and Reviewer)
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = audioStream.getAudioTracks()[0];

            // Add to local stream (create one if it doesn't exist)
            if (localStreamRef.current) {
                localStreamRef.current.addTrack(audioTrack);
            } else {
                localStreamRef.current = audioStream;
            }

            // Add to active Peer Connection if exists
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
            alert("Microphone permission denied.");
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
