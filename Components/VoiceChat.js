'use client';
import React, { useContext } from 'react';
import { AgoraContext } from '@/context/voiceContext';
import CallButton from './CallButton';
import MuteButton from './MuteButton';
import VideoControls from './VideoControls';
import '../app/chat/chat.css';

const VoiceChat = () => {
    const {
        isJoined,
        joinChannel,
        leaveChannel,
        toggleMute,
        isMuted,
        error,
    } = useContext(AgoraContext);

    return (
        <div className="voice-chat-container">
            {error && <p className="error-message">Error: {error.message}</p>}

            {!isJoined && (
                <div className="call-button-container">
                    <CallButton onClick={joinChannel} />
                </div>
            )}

            {isJoined && (
                <div className="controls-container">
                    <VideoControls />
                    <MuteButton onClick={toggleMute} isMuted={isMuted} />
                    <button className="leave-button" onClick={leaveChannel}>
                        Leave
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoiceChat;
