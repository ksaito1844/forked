'use client'
import React, { useContext } from 'react';
import { AgoraContext } from '@/context/voiceContext';

const CallButton = ({ onClick }) => {
    const { isJoined } = useContext(AgoraContext);
    return (
        <button onClick={onClick}>
            {isJoined ? 'Leave' : 'Test (only audio chat feature available)'}
        </button>
    );
};

export default CallButton;
