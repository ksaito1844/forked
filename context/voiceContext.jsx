'use client';
import { createContext, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const AgoraRTCProviderPrimitive = dynamic(
    () =>
        import('agora-rtc-react').then(({ AgoraRTCProvider }) => AgoraRTCProvider),
    { ssr: false },
);

const AgoraContext = createContext();

const AgoraProvider = ({ children }) => {
    const clientConfigRef = useRef({ codec: 'vp8', mode: 'rtc' });
    const [client, setClient] = useState(null);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [localUserId, setLocalUserId] = useState(null);
    const [error, setError] = useState(null);
    const [agoraRTC, setAgoraRTC] = useState(null);

    useEffect(() => {
        const initSdk = async () => {
            try {
                const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
                const client = AgoraRTC.createClient(clientConfigRef.current);
                setAgoraRTC(AgoraRTC);
                setClient(client);
            } catch (err) {
                console.error('Failed to initialize Agora SDK:', err);
                setError(err);
            }
        };
        initSdk();
    }, []);

    useEffect(() => {
        if (!client) return;

        const handleUserPublished = (user, mediaType) => {
            if (mediaType === 'audio') {
                client.subscribe(user, mediaType).then(() => {
                    user.audioTrack.play();
                    setRemoteUsers((prevUsers) => {
                        const exists = prevUsers.find((u) => u.uid === user.uid);
                        return exists ? prevUsers : [...prevUsers, user];
                    });
                }).catch((error) => {
                    console.error('Failed to subscribe to user:', error);
                });
            }
        };

        const handleUserUnpublished = (user) => {
            setRemoteUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
        };

        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
        };
    }, [client]);

    const joinChannel = async () => {
        if (!client) return;
        try {
            const uid = await client.join(
                process.env.NEXT_PUBLIC_AGORA_APP_ID,
                process.env.NEXT_PUBLIC_AGORA_CHANNEL_NAME,
                null,
                null,
            );
            setLocalUserId(uid);
            setIsJoined(true);
            publishAudio();
        } catch (err) {
            console.error('Failed to join channel:', err);
            setError(err);
        }
    };

    const leaveChannel = async () => {
        if (!client) return;
        try {
            await client.leave();
            setIsJoined(false);
            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
                setLocalAudioTrack(null);
            }
            setRemoteUsers([]);
        } catch (err) {
            console.error('Failed to leave channel:', err);
            setError(err);
        }
    };

    const toggleMute = async () => {
        if (!localAudioTrack) return;
        try {
            await localAudioTrack.setMuted(!isMuted);
            setIsMuted(!isMuted);
        } catch (err) {
            console.error('Failed to toggle mute:', err);
            setError(err);
        }
    };

    const publishAudio = async () => {
        if (!agoraRTC || !client) return;
        try {
            const audioTrack = await agoraRTC.createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
        } catch (err) {
            console.error('Failed to publish audio:', err);
            setError(err);
        }
    };

    return (
        <AgoraRTCProviderPrimitive client={client}>
            <AgoraContext.Provider
                value={{
                    client,
                    localAudioTrack,
                    remoteUsers,
                    isMuted,
                    isJoined,
                    error,
                    joinChannel,
                    leaveChannel,
                    toggleMute,
                    publishAudio,
                    localUserId,
                }}
            >
                {children}
            </AgoraContext.Provider>
        </AgoraRTCProviderPrimitive>
    );
};

export { AgoraContext, AgoraProvider };
