'use client';
import { createContext, useState, useEffect } from 'react';
import AgoraRTC, { AgoraRTCProvider, useRTCClient } from 'agora-rtc-react';

const AgoraContext = createContext();

const AgoraProvider = ({ children }) => {
    const agoraClient = useRTCClient(AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' }));
    const [client, setClient] = useState(agoraClient);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [localUserId, setLocalUserId] = useState(null);
    const [error, setError] = useState(null);

    const joinChannel = async () => {
        try {
            const uid = await client.join(
                process.env.NEXT_PUBLIC_AGORA_APP_ID,
                process.env.NEXT_PUBLIC_AGORA_CHANNEL_NAME,
                null,
                null
            );
            setLocalUserId(uid);
            setIsJoined(true);
            publishAudio();
        } catch (err) {
            setError(err);
        }
    };

    const leaveChannel = async () => {
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
            setError(err);
        }
    };

    const toggleMute = async () => {
        try {
            if (localAudioTrack) {
                await localAudioTrack.setMuted(!isMuted);
                setIsMuted(!isMuted);
            }
        } catch (err) {
            setError(err);
        }
    };

    const publishAudio = async () => {
        try {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            await client.publish(audioTrack);
            setLocalAudioTrack(audioTrack);
        } catch (err) {
            setError(err);
        }
    };

    useEffect(() => {
        const handleUserPublished = (user, mediaType) => {
            console.log(user, 'userpublished')
            if (mediaType === 'audio') {
                client.subscribe(user, mediaType).then(() => {
                    user.audioTrack.play();
                    setRemoteUsers((prevUsers) => {
                        const exists = prevUsers.find((u) => u.uid === user.uid);
                        if (!exists) {
                            return [...prevUsers, user];
                        }
                        return prevUsers;
                    });
                }).catch((error) => {
                    console.error('Failed to subscribe to user:', error);
                });
            }
        };

        const handleUserUnpublished = (user) => {
            console.log(user, 'userunpublished')
            setRemoteUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
        };

        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);

        return () => {
            client.off('user-published', handleUserPublished);
            client.off('user-unpublished', handleUserUnpublished);
        };
    }, [client]);

    return (
        <AgoraRTCProvider client={client}>
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
                    localUserId
                }}
            >
                {children}
            </AgoraContext.Provider>
        </AgoraRTCProvider>
    );
};

export { AgoraContext, AgoraProvider };
