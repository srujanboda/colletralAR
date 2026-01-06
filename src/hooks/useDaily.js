import { useEffect, useState, useRef, useCallback } from 'react';
import Daily from '@daily-co/daily-js';

/**
 * useDaily - Hook for Daily.co video/screen sharing
 * 
 * Uses Daily.co for reliable screen sharing while keeping PeerJS for data sync.
 * 
 * @param {string} roomCode - The room code (shared between User and Reviewer)
 * @param {string} role - 'user' or 'reviewer'
 */
export const useDaily = (roomCode, role) => {
    const [callObject, setCallObject] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [isJoined, setIsJoined] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
    const [participants, setParticipants] = useState({});
    const videoRef = useRef(null);

    // Create Daily room URL based on room code
    // For demo, we'll use Daily's demo domain or you can replace with your own
    const getRoomUrl = useCallback(() => {
        // You can replace 'your-domain' with your Daily.co subdomain
        // For testing, Daily provides demo rooms at https://demo.daily.co/roomname
        return `https://arcolletral.daily.co/${roomCode}`;
    }, [roomCode]);

    // Initialize Daily call object
    useEffect(() => {
        if (!roomCode) return;

        const call = Daily.createCallObject({
            showLeaveButton: false,
            showFullscreenButton: false,
        });

        // Event handlers
        call.on('joining-meeting', () => {
            console.log('📹 Daily: Joining meeting...');
            setStatus('Joining room...');
        });

        call.on('joined-meeting', () => {
            console.log('📹 Daily: Joined meeting!');
            setStatus('Connected to Daily room');
            setIsJoined(true);
        });

        call.on('left-meeting', () => {
            console.log('📹 Daily: Left meeting');
            setStatus('Disconnected');
            setIsJoined(false);
            setIsScreenSharing(false);
        });

        call.on('participant-joined', (event) => {
            console.log('📹 Daily: Participant joined:', event.participant.user_id);
            setParticipants(call.participants());
        });

        call.on('participant-left', (event) => {
            console.log('📹 Daily: Participant left:', event.participant.user_id);
            setParticipants(call.participants());

            // Clear remote video if it was from them
            if (event.participant.screen) {
                setRemoteVideoTrack(null);
            }
        });

        call.on('participant-updated', (event) => {
            console.log('📹 Daily: Participant updated');
            setParticipants(call.participants());

            // Check if they're screen sharing
            const participant = event.participant;
            if (participant.screen && participant.local === false) {
                console.log('📹 Daily: Remote screen share detected!');
                const screenTrack = participant.tracks?.screenVideo?.track;
                if (screenTrack) {
                    setRemoteVideoTrack(screenTrack);
                }
            }
        });

        call.on('track-started', (event) => {
            console.log('📹 Daily: Track started:', event.track?.kind, event.participant?.local ? 'local' : 'remote');

            // If it's a remote screen track, use it
            if (!event.participant?.local && event.track) {
                if (event.track.kind === 'video') {
                    console.log('📹 Daily: Got remote video track!');
                    setRemoteVideoTrack(event.track);
                } else if (event.track.kind === 'audio') {
                    setRemoteAudioTrack(event.track);
                }
            }
        });

        call.on('track-stopped', (event) => {
            console.log('📹 Daily: Track stopped');
            if (!event.participant?.local) {
                if (event.track?.kind === 'video') {
                    setRemoteVideoTrack(null);
                }
            }
        });

        call.on('error', (error) => {
            console.error('📹 Daily Error:', error);
            setStatus(`Error: ${error.errorMsg || error.error || 'Unknown error'}`);
        });

        setCallObject(call);

        return () => {
            call.destroy();
        };
    }, [roomCode]);

    // Join the room when call object is ready
    useEffect(() => {
        if (!callObject || !roomCode) return;

        const joinRoom = async () => {
            try {
                const roomUrl = getRoomUrl();
                console.log('📹 Daily: Joining room:', roomUrl);
                setStatus('Connecting to room...');

                await callObject.join({
                    url: roomUrl,
                    userName: role === 'user' ? 'AR User' : 'Reviewer',
                    startVideoOff: true,  // Don't start with camera
                    startAudioOff: true,  // Don't start with mic
                });
            } catch (err) {
                console.error('📹 Daily: Join error:', err);
                setStatus(`Join error: ${err.message}`);
            }
        };

        joinRoom();
    }, [callObject, roomCode, role, getRoomUrl]);

    // Start screen sharing (User only)
    const startScreenShare = useCallback(async () => {
        if (!callObject || !isJoined) {
            console.error('📹 Cannot start screen share - not joined');
            return false;
        }

        try {
            console.log('📹 Daily: Starting screen share...');
            setStatus('Starting screen share...');

            await callObject.startScreenShare();

            setIsScreenSharing(true);
            setStatus('Screen sharing active');
            console.log('📹 Daily: Screen share started successfully!');
            return true;
        } catch (err) {
            console.error('📹 Daily: Screen share error:', err);
            setStatus(`Screen share error: ${err.message}`);
            return false;
        }
    }, [callObject, isJoined]);

    // Stop screen sharing
    const stopScreenShare = useCallback(async () => {
        if (!callObject) return;

        try {
            await callObject.stopScreenShare();
            setIsScreenSharing(false);
            setStatus('Screen share stopped');
        } catch (err) {
            console.error('📹 Daily: Stop screen share error:', err);
        }
    }, [callObject]);

    // Leave the room
    const leaveRoom = useCallback(async () => {
        if (!callObject) return;

        try {
            await callObject.leave();
            setIsJoined(false);
            setIsScreenSharing(false);
        } catch (err) {
            console.error('📹 Daily: Leave error:', err);
        }
    }, [callObject]);

    // Toggle microphone
    const toggleMic = useCallback(async () => {
        if (!callObject) return;

        try {
            const localParticipant = callObject.participants().local;
            const isAudioEnabled = localParticipant?.audio;

            await callObject.setLocalAudio(!isAudioEnabled);
        } catch (err) {
            console.error('📹 Daily: Toggle mic error:', err);
        }
    }, [callObject]);

    // Bind remote video to a video element
    const bindVideoElement = useCallback((videoElement) => {
        if (!videoElement) return;

        if (remoteVideoTrack) {
            const stream = new MediaStream([remoteVideoTrack]);
            videoElement.srcObject = stream;
            videoElement.play().catch(e => console.log('Video play error:', e));
        } else {
            videoElement.srcObject = null;
        }
    }, [remoteVideoTrack]);

    return {
        status,
        isJoined,
        isScreenSharing,
        remoteVideoTrack,
        participants,
        startScreenShare,
        stopScreenShare,
        leaveRoom,
        toggleMic,
        bindVideoElement,
        callObject,
    };
};

export default useDaily;
