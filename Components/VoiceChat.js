'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AgoraContext } from '@/context/voiceContext';
import CallButton from './CallButton';
import MuteButton from './MuteButton';
import VideoControls from './VideoControls';
import '../app/chat/chat.css';
import { useSocket } from '@/context/SocketContext';

const VoiceChat = () => {
  const {
    isJoined,
    joinChannel,
    leaveChannel,
    toggleMute,
    isMuted,
    error,
    remoteUsers,
    localUserId,
    localAudioTrack,
    remoteAudioTrack
  } = useContext(AgoraContext);

  const socket = useSocket();

  const [processor, setProcessor] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [audioInput, setAudioInput] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcripts, setTranscripts] = useState([]);

  const divRef = useRef(null);

  const stopTranscribing = () => {
    console.log('Stop button clicked');
    if (audioContext && audioContext.state !== 'closed') {
      audioInput?.disconnect();
      processor?.disconnect();
      audioContext.close();
      socket.emit('stopTranscribing');      
    }
  }

  useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
    }
  }, [transcripts]);

  useEffect(() => {
    if (socket == null) return;

    socket.on('transcription', data => {
      console.log('Received transcription:', data);
      if (data.isFinal) {
        setTranscripts((prev) => [...prev, currentTranscript + data.text]);
        setCurrentTranscript("");
      } else {
        const partialTranscript = currentTranscript + data.text;
        setCurrentTranscript(partialTranscript);
      }
    });

    socket.on('error', errorMessage => {
      console.error('Server error: ', errorMessage);
    })
  }, [socket]);

  useEffect(() => {
    if (remoteAudioTrack == null) {
      stopTranscribing();
      return;
    }

    const handleRemoteAudioData = (audioTrack) => {
      try {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(audioTrack.getMediaStreamTrack());

        const audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(audioContextInstance);

        const source = audioContextInstance.createMediaStreamSource(mediaStream);
        setAudioInput(source);

        const scriptProcessor = audioContextInstance.createScriptProcessor(1024, 1, 1);
        setProcessor(scriptProcessor);

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContextInstance.destination);

        scriptProcessor.onaudioprocess = async (e) => {
          const float32Array = e.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(float32Array.length);

          for (let i = 0; i < float32Array.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(float32Array[i] * 32768)));
          }

          console.log('Sending audio chunk to server, size:', int16Array.buffer.byteLength);
          socket.emit('audioData', int16Array.buffer);
        };

        socket.emit('startTranscription');
        console.log('startTranscription event emitted');
      } catch (error) {
        console.error('Error accessing microphone: ', error);
      }
    }

    handleRemoteAudioData(remoteAudioTrack);
  }, [remoteAudioTrack])

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

          <div className="connected-users">
            <h4>Connected Users:</h4>
            <div className="user-id">
              <strong>Local User ID:</strong> {localUserId}
            </div>
            {remoteUsers.length > 0 && (
              <div>
                <h4>Remote Users:</h4>
                {remoteUsers.map((user) => (
                  <div key={user.uid}>
                    User ID: {user.uid}
                  </div>
                ))}
              </div>
            )}
          </div>
          {(currentTranscript.length > 0 || transcripts.length > 0) && (
            <div className='transcript'>
              <div className='current-transcript'>
                Transcript: {currentTranscript}
              </div>
              <div className='final-transcript' ref={divRef}>
                {transcripts.map((transcript, key) => (
                  <p key={key}>{transcript}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
