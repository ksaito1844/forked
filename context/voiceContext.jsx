'use client';
import { createContext, useState, useEffect, useContext } from 'react';
import AgoraRTC, {
    AgoraRTCProvider,
    useRTCClient,
} from "agora-rtc-react";
const AgoraContext = createContext();

const AgoraProvider = ({ children }) => {
    const agoraClient = useRTCClient(AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }));
    const [client, setClient] = useState(agoraClient);
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [error, setError] = useState(null);

    const joinChannel = async () => {
        try {
            await client.join(
                process.env.NEXT_PUBLIC_AGORA_APP_ID,
                process.env.NEXT_PUBLIC_AGORA_CHANNEL_NAME,
                null,
                null // user ID 
            );
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
            if (remoteAudioTrack) {
                remoteAudioTrack.stop();
                setRemoteAudioTrack(null);
            }
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

    return (
        <AgoraRTCProvider client={client}>
            <AgoraContext.Provider
                value={{
                    client,
                    localAudioTrack,
                    remoteAudioTrack,
                    isMuted,
                    isJoined,
                    error,
                    joinChannel,
                    leaveChannel,
                    toggleMute,
                    publishAudio,
                }}
            >
                {children}
            </AgoraContext.Provider>
        </AgoraRTCProvider>
    );
};

export { AgoraContext, AgoraProvider };
