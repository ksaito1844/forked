'use client'
import React, { useContext } from 'react';
import { AgoraContext } from '@/context/voiceContext';

const MuteButton = ({ onClick, isMuted }) => {
    return (
        <button onClick={onClick}>
            {isMuted ? 'Unmute' : 'Mute'}
        </button>
    );
};

export default MuteButton;